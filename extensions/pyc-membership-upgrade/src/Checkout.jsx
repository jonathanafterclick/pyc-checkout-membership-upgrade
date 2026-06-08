import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState } from "preact/hooks";

const SELLING_PLAN_ID = "gid://shopify/SellingPlan/1822752864";

const TEST_ATTRIBUTE_KEY = "pyc_membership_checkout_test";
const TEST_VARIANT_VALUE = "variant";

const ELIGIBLE_TICKET_PRODUCT_IDS = [
  "gid://shopify/Product/7691296505952",
  "gid://shopify/Product/7599940698208",
  "gid://shopify/Product/7514010157152",
  "gid://shopify/Product/7400021786720",
  "gid://shopify/Product/7353942638688",
  "gid://shopify/Product/7353931759712",
  "gid://shopify/Product/7344872489056",
  "gid://shopify/Product/7274118512736",
  "gid://shopify/Product/7274116186208",
  "gid://shopify/Product/7274110189664",
  "gid://shopify/Product/7265522450528",
  "gid://shopify/Product/7206872416352",
];

const MEMBERSHIP_BY_QUANTITY = {
  1: {
    variantId: "gid://shopify/ProductVariant/42773692481632",
    savings: "$10",
    renews: "$59/month",
  },
  2: {
    variantId: "gid://shopify/ProductVariant/42773692514400",
    savings: "$20",
    renews: "$118/month",
  },
  3: {
    variantId: "gid://shopify/ProductVariant/42773692547168",
    savings: "$30",
    renews: "$177/month",
  },
  4: {
    variantId: "gid://shopify/ProductVariant/42773692579936",
    savings: "$40",
    renews: "$236/month",
  },
};

const MEMBERSHIP_VARIANT_IDS = Object.values(MEMBERSHIP_BY_QUANTITY).map(
  (offer) => offer.variantId
);

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [checked, setChecked] = useState(false);

  const testVariant = getCartAttribute(TEST_ATTRIBUTE_KEY);

  if (testVariant !== TEST_VARIANT_VALUE) {
    return null;
  }

  const customer = shopify?.buyerIdentity?.customer?.value;
  const isLoggedIn = Boolean(customer?.id);

  if (isLoggedIn) return null;

  const lines = shopify?.lines?.value || shopify?.cartLines?.value || [];

  const ticketQuantity = lines
    .filter((line) =>
      ELIGIBLE_TICKET_PRODUCT_IDS.includes(line.merchandise?.product?.id)
    )
    .reduce((total, line) => total + Number(line.quantity || 0), 0);

  const selectedQuantity =
    ticketQuantity >= 1 && ticketQuantity <= 4 ? ticketQuantity : null;

  const offer = selectedQuantity
    ? MEMBERSHIP_BY_QUANTITY[selectedQuantity]
    : null;

  if (!offer) return null;

  const membershipLines = lines.filter((line) =>
    MEMBERSHIP_VARIANT_IDS.includes(line.merchandise?.id)
  );

  const currentOfferMembershipLine = membershipLines.find(
    (line) => line.merchandise?.id === offer.variantId
  );

  const isMembershipInCart = membershipLines.length > 0;
  const checkboxChecked = checked || isMembershipInCart;

  const sessionLabel =
    selectedQuantity === 1
      ? "1 free puppy yoga session"
      : `${selectedQuantity} free puppy yoga sessions`;

  async function removeExistingMembershipLines() {
    for (const line of membershipLines) {
      if (!line?.id) continue;

      await shopify.applyCartLinesChange({
        type: "removeCartLine",
        id: line.id,
        quantity: line.quantity,
      });
    }
  }

  async function handleChange(event) {
    const isChecked = event.target.checked;

    try {
      if (isChecked) {
        setChecked(true);

        if (currentOfferMembershipLine) return;

        await removeExistingMembershipLines();

        const result = await shopify.applyCartLinesChange({
          type: "addCartLine",
          merchandiseId: offer.variantId,
          quantity: 1,
          sellingPlanId: SELLING_PLAN_ID,
        });

        if (result.type === "error") {
          setChecked(false);
        }

        return;
      }

      await removeExistingMembershipLines();
      setChecked(false);
    } catch (error) {
      console.error(error);
      setChecked(isMembershipInCart);
    }
  }

  return (
    <s-box border="base" borderRadius="base" padding="base">
      <s-grid gridTemplateColumns="auto 1fr" gap="base" alignItems="start">
        <s-checkbox checked={checkboxChecked} onChange={handleChange} />

        <s-stack gap="small">
          <s-text type="strong" tone="neutral">
            Save {offer.savings} today with Puppy Yoga Membership
          </s-text>

          <s-text color="subdued">
            Join today and enjoy {sessionLabel} every month starting next month.
          </s-text>

          <s-text type="small" color="subdued">
            Free today • Renews at {offer.renews} starting next month • Cancel
            anytime after your first renewal
          </s-text>
        </s-stack>
      </s-grid>
    </s-box>
  );
}

function getCartAttribute(key) {
  const attributes = shopify?.attributes?.value || [];

  const attribute = attributes.find((item) => item.key === key);

  return attribute?.value || "";
}