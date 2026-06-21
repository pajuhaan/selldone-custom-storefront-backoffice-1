function firstArray(...values) {
  return values.find((value) => Array.isArray(value)) || [];
}

function firstNonNull(...values) {
  return values.find((value) => value !== null && value !== undefined);
}

function toRatingNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function storefrontRatingBooleanFlag(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "y", "buyer", "purchased", "bought"].includes(normalized)) return true;
    if (["0", "false", "no", "n", "null", "none"].includes(normalized)) return false;
  }
  return Boolean(value);
}

export function productCanRateFromPayload(raw = {}) {
  const explicit = firstNonNull(
    raw.can_rate,
    raw.canRate,
    raw.can_rate_product,
    raw.canRateProduct,
    raw.can_review,
    raw.canReview,
    raw.can_comment_rate,
    raw.canCommentRate,
    null,
  );
  if (explicit !== null && explicit !== undefined) return storefrontRatingBooleanFlag(explicit);

  const purchased = firstNonNull(
    raw.purchased,
    raw.has_purchased,
    raw.hasPurchased,
    raw.bought,
    raw.has_bought,
    raw.hasBought,
    raw.is_buyer,
    raw.isBuyer,
    raw.buyer,
    raw.ordered,
    raw.has_order,
    raw.hasOrder,
    null,
  );
  if (purchased !== null && purchased !== undefined) return storefrontRatingBooleanFlag(purchased);

  const myRating = firstNonNull(
    raw.my_rating,
    raw.myRating,
    raw.my_ratings,
    raw.myRatings,
    raw.user_rating,
    raw.userRating,
    raw.user_ratings,
    raw.userRatings,
    raw.rating_by_me,
    raw.ratingByMe,
    null,
  );
  return Boolean(myRating && typeof myRating === "object" ? Object.keys(myRating).length : myRating);
}

export function normalizeProductRatingCriteria(rawRatings = []) {
  return (Array.isArray(rawRatings) ? rawRatings : [])
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const id = String(firstNonNull(entry.id, entry.rating_id, entry.ratingId, entry.key, index + 1) || "").trim();
      const name = String(firstNonNull(entry.name, entry.title, entry.label, `Rating ${index + 1}`) || `Rating ${index + 1}`).trim();
      const value = toRatingNumber(firstNonNull(entry.value, entry.total, 0), 0);
      const count = toRatingNumber(firstNonNull(entry.count, entry.total_count, entry.totalCount, 0), 0);
      const average = count > 0 ? Math.max(0, Math.min(5, value / count)) : toRatingNumber(firstNonNull(entry.average, entry.rate, entry.rating, 0), 0);
      return {
        id,
        name,
        value,
        count,
        average: Math.max(0, Math.min(5, average)),
      };
    })
    .filter((entry) => entry?.id && entry?.name);
}

export function normalizeProductMyRating(raw = {}, ratingCriteria = []) {
  const source = firstNonNull(
    raw.my_rating,
    raw.myRating,
    raw.my_ratings,
    raw.myRatings,
    raw.user_rating,
    raw.userRating,
    raw.user_ratings,
    raw.userRatings,
    raw.rating_by_me,
    raw.ratingByMe,
    raw.my_rate,
    raw.myRate,
    raw.my_rates,
    raw.myRates,
    raw.user_rate,
    raw.userRate,
    raw.user_rates,
    raw.userRates,
    raw.customer_rating,
    raw.customerRating,
    raw.customer_ratings,
    raw.customerRatings,
    raw.customer_rate,
    raw.customerRate,
    raw.customer_rates,
    raw.customerRates,
    raw.viewer_rating,
    raw.viewerRating,
    raw.viewer_ratings,
    raw.viewerRatings,
    raw.viewer_rate,
    raw.viewerRate,
    raw.viewer_rates,
    raw.viewerRates,
    null,
  );
  if (!source) return null;

  const aliases = new Map();
  const addAlias = (alias, id) => {
    const safeAlias = String(alias || "").trim();
    const safeId = String(id || "").trim();
    if (safeAlias && safeId) aliases.set(safeAlias, safeId);
  };
  ratingCriteria.forEach((criterion, index) => {
    const id = String(firstNonNull(criterion?.id, criterion?.rating_id, criterion?.ratingId, criterion?.key, criterion?.name, index + 1) || "").trim();
    if (!id) return;
    [
      id,
      criterion?.name,
      criterion?.title,
      criterion?.label,
      criterion?.key,
      criterion?.slug,
      criterion?.code,
      criterion?.rating_id,
      criterion?.ratingId,
      criterion?.rate_id,
      criterion?.rateId,
      criterion?.product_rating_id,
      criterion?.productRatingId,
      index + 1,
    ].forEach((alias) => addAlias(alias, id));
  });

  const normalized = {};
  const assign = (key, value) => {
    const objectKey =
      value && typeof value === "object"
        ? firstNonNull(
            value.id,
            value.rating_id,
            value.ratingId,
            value.rate_id,
            value.rateId,
            value.product_rating_id,
            value.productRatingId,
            value.key,
            value.slug,
            value.code,
            value.name,
            value.title,
            value.label,
            null,
          )
        : null;
    const rawKey = String(firstNonNull(objectKey, key, "") || "").trim();
    const resolvedKey = aliases.get(rawKey) || rawKey;
    const rawValue =
      value && typeof value === "object"
        ? firstNonNull(value.value, value.rate, value.rating, value.score, value.point, value.points, value.stars, 0)
        : value;
    const numeric = Number(rawValue);
    if (!resolvedKey || !Number.isFinite(numeric) || numeric < 1 || numeric > 5) return;
    normalized[resolvedKey] = Math.max(1, Math.min(5, Math.round(numeric)));
  };

  const nestedKeys = new Set([
    "user_rating",
    "userRating",
    "user_ratings",
    "userRatings",
    "my_rating",
    "myRating",
    "my_ratings",
    "myRatings",
    "my_rates",
    "myRates",
    "user_rates",
    "userRates",
    "rating_values",
    "ratingValues",
    "rating_items",
    "ratingItems",
    "ratings",
    "rates",
    "items",
    "values",
    "criteria",
  ]);

  const walk = (value, fallbackKey = "") => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, String(index + 1)));
      return;
    }
    if (typeof value === "object") {
      const directKey = firstNonNull(
        value.id,
        value.rating_id,
        value.ratingId,
        value.rate_id,
        value.rateId,
        value.product_rating_id,
        value.productRatingId,
        value.key,
        value.slug,
        value.code,
        value.name,
        value.title,
        value.label,
        fallbackKey,
      );
      const directValue = firstNonNull(value.value, value.rate, value.rating, value.score, value.point, value.points, value.stars, null);
      if (directValue !== null && directValue !== undefined) assign(directKey, directValue);

      const nested = firstNonNull(
        value.user_rating,
        value.userRating,
        value.user_ratings,
        value.userRatings,
        value.my_rating,
        value.myRating,
        value.my_ratings,
        value.myRatings,
        value.my_rates,
        value.myRates,
        value.user_rates,
        value.userRates,
        value.rating_values,
        value.ratingValues,
        value.rating_items,
        value.ratingItems,
        value.ratings,
        value.rates,
        value.items,
        value.values,
        value.criteria,
        null,
      );
      if (nested) walk(nested, fallbackKey);

      if (directValue === null || directValue === undefined) {
        Object.entries(value).forEach(([key, entry]) => {
          if (nestedKeys.has(key)) return;
          assign(key, entry);
        });
      }
      return;
    }
    assign(fallbackKey, value);
  };

  walk(source);
  return Object.keys(normalized).length ? normalized : source;
}

function reviewQualityLabel(value) {
  return (
    {
      1: "Poor",
      2: "Fair",
      3: "Good",
      4: "Very good",
      5: "Excellent",
    }[Number(value)] || "Choose"
  );
}

function reviewRatingCriterionId(value = "", fallback = "") {
  return String(value || fallback || "")
    .trim()
    .replace(/[^a-z0-9_-]/gi, "-");
}

function selectedReviewRatingValue(selectedRatings, criterionId = "", label = "") {
  const keys = [criterionId, label].map((entry) => String(entry || "").trim()).filter(Boolean);
  if (!keys.length || !selectedRatings) return 0;
  if (Array.isArray(selectedRatings)) {
    const match = selectedRatings.find((entry) => {
      const entryKeys = [
        entry?.id,
        entry?.rating_id,
        entry?.ratingId,
        entry?.rate_id,
        entry?.rateId,
        entry?.product_rating_id,
        entry?.productRatingId,
        entry?.key,
        entry?.slug,
        entry?.code,
        entry?.name,
        entry?.title,
        entry?.label,
      ]
        .map((part) => String(part || "").trim())
        .filter(Boolean);
      return entryKeys.some((entryKey) => keys.includes(entryKey));
    });
    const value = Number(match?.value ?? match?.rate ?? match?.rating ?? match?.score ?? 0);
    return Number.isFinite(value) ? Math.max(0, Math.min(5, Math.round(value))) : 0;
  }
  if (typeof selectedRatings === "object") {
    const rawValue = keys.map((key) => selectedRatings[key]).find((entry) => entry != null) ?? 0;
    const value = Number(
      rawValue && typeof rawValue === "object"
        ? (rawValue.value ?? rawValue.rate ?? rawValue.rating ?? rawValue.score ?? rawValue.point ?? rawValue.points ?? rawValue.stars ?? 0)
        : rawValue,
    );
    return Number.isFinite(value) ? Math.max(0, Math.min(5, Math.round(value))) : 0;
  }
  return 0;
}

export function renderProductRatingControls(criteria = [], options = {}) {
  const { escapeHtml, formSafeId, disabled = false, selectedRatings = {} } = options;
  if (!criteria.length) {
    return `<p class="checkout-login-note">Rating criteria are not available for this product.</p>`;
  }

  return `
    <fieldset class="review-rating-field" ${disabled ? "disabled" : ""}>
      <legend>Product ratings</legend>
      <div class="review-criteria-list">
        ${criteria
          .map((criterion, index) => {
            const criterionId = String(criterion?.id || criterion?.rating_id || criterion?.ratingId || criterion?.rate_id || criterion?.rateId || criterion?.product_rating_id || criterion?.productRatingId || criterion?.key || index + 1).trim();
            const safeCriterionId = reviewRatingCriterionId(criterionId, index + 1);
            const label = String(criterion?.name || `Rating ${index + 1}`).trim();
            const selectedValue = selectedReviewRatingValue(selectedRatings, criterionId, label);
            return `
              <div class="review-criterion ${disabled ? "is-disabled" : ""}" data-rating-criterion data-rating-criterion-id="${escapeHtml(criterionId)}">
                <span class="review-criterion-label">${escapeHtml(label)}</span>
                <div class="review-rating-meter" aria-live="polite">
                  <span data-rating-quality>${disabled ? "Locked" : selectedValue ? escapeHtml(reviewQualityLabel(selectedValue)) : "Choose"}</span>
                  <b><i data-rating-progress style="--rating-progress: ${selectedValue ? selectedValue * 20 : 0}%"></i></b>
                </div>
                <div class="review-rating-scale" aria-label="${escapeHtml(label)} rating">
                  ${[1, 2, 3, 4, 5]
                    .map((value) => {
                      const inputId = `review-rating-${formSafeId}-${safeCriterionId}-${value}`;
                      return `
                        <label class="review-rating-choice" for="${escapeHtml(inputId)}">
                          <input
                            id="${escapeHtml(inputId)}"
                            name="rating_${escapeHtml(safeCriterionId)}"
                            type="radio"
                            value="${value}"
                            data-rating-input
                            data-rating-criterion-id="${escapeHtml(criterionId)}"
                            ${disabled ? "disabled" : ""}
                            ${selectedValue === value ? "checked" : ""}
                          />
                          <span><strong>${value}</strong><small>${escapeHtml(reviewQualityLabel(value))}</small></span>
                        </label>
                      `;
                    })
                    .join("")}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </fieldset>
  `;
}

export function updateProductRatingSubmitState(form) {
  if (!form) return;
  const submit = form.querySelector("[data-review-submit]");
  if (!submit) return;
  const comment = String(form.querySelector('textarea[name="comment"]')?.value || "").trim();
  const canRate = form.dataset.productCanRate === "1";
  const reviewMode = form.dataset.reviewMode || "review";
  const ratingInputs = [...form.querySelectorAll("[data-rating-input]")].filter((input) => !input.disabled);

  form.querySelectorAll("[data-rating-criterion]").forEach((criterion) => {
    const checked = criterion.querySelector("[data-rating-input]:checked");
    const value = checked ? Number(checked.value) : 0;
    const quality = criterion.querySelector("[data-rating-quality]");
    const progress = criterion.querySelector("[data-rating-progress]");
    criterion.dataset.ratingValue = value ? String(value) : "";
    if (quality) quality.textContent = value ? reviewQualityLabel(value) : "Choose";
    if (progress) progress.style.setProperty("--rating-progress", value ? `${value * 20}%` : "0%");
  });

  const criterionIds = [...new Set(ratingInputs.map((input) => String(input.dataset.ratingCriterionId || "").trim()).filter(Boolean))];
  const requiresComment = reviewMode !== "rating";
  const requiresRating = canRate && reviewMode !== "comment" && criterionIds.length > 0;
  const ratingFormUnavailable = reviewMode === "rating" && !criterionIds.length;
  const ratingsComplete =
    !requiresRating ||
    criterionIds.every((criterionId) => ratingInputs.some((input) => input.dataset.ratingCriterionId === criterionId && input.checked));

  submit.disabled = ratingFormUnavailable || (requiresComment && !comment) || !ratingsComplete || form.dataset.submitting === "1";
}

export function renderProductRatingSection(options = {}) {
  const {
    escapeHtml,
    firstNonNull,
    reviewStarsMarkup,
    state,
    reviewAverage,
    reviewCount,
    productRatingCriteria,
    productCanRate,
    userHasRating,
    selectedUserRatings,
    ratingEditorId,
    reviewFormSafeId,
    reviewFormNotice,
    sessionUserName,
    sessionAvatarUrl,
  } = options;

  const ratingOverviewRows = (productRatingCriteria.length ? productRatingCriteria : [{ id: "overall", name: "Overall rating", average: reviewAverage }])
    .map((criterion, index) => {
      const label = String(firstNonNull(criterion?.name, criterion?.title, criterion?.label, criterion?.id, `Rating ${index + 1}`) || "").trim();
      const rawValue = Number(firstNonNull(criterion?.average, criterion?.avg, criterion?.value, criterion?.rate, criterion?.rating, reviewAverage, 0));
      const safeValue = Number.isFinite(rawValue) && rawValue > 0 ? Math.max(1, Math.min(5, rawValue)) : Math.max(0, Math.min(5, reviewAverage));
      return `
        <div class="rating-overview-row">
          <span>${escapeHtml(label)}</span>
          <b><i style="--rating-progress: ${Math.round((safeValue / 5) * 100)}%"></i></b>
          <em>${escapeHtml(reviewQualityLabel(Math.round(safeValue)))}</em>
        </div>
      `;
    })
    .join("");

  const ratingUserBadge = state.sessionAuthenticated
    ? `<span class="rating-action-user">${sessionAvatarUrl ? `<img src="${escapeHtml(sessionAvatarUrl)}" alt="" loading="lazy" />` : ""}${escapeHtml(sessionUserName)}</span>`
    : "";
  const ratingAccessNotice =
    state.sessionAuthenticated && !productCanRate
      ? `<p class="checkout-login-note">Only verified buyers can rate this product.</p>`
      : "";
  const reviewRatingControls = productCanRate
    ? renderProductRatingControls(productRatingCriteria, {
        escapeHtml,
        formSafeId: reviewFormSafeId,
        disabled: false,
        selectedRatings: selectedUserRatings,
      })
    : "";

  return `
    <section class="rating-section" id="ratings">
      <div class="rating-score-copy">
        <strong>${Math.max(0, Math.min(5, reviewAverage)).toFixed(1)}<small>/ 5</small></strong>
        <p>This product has received a rating of ${Math.max(0, Math.min(5, reviewAverage)).toFixed(1)} out of 5 stars and rated by ${reviewCount.toLocaleString()} people.</p>
      </div>
      <div class="rating-panel">
        <div class="rating-panel-head">
          <span class="review-card-stars">${reviewStarsMarkup(reviewAverage)}</span>
          <span class="product-meta">(${reviewCount.toLocaleString()})</span>
        </div>
        <div class="rating-overview-list">
          ${ratingOverviewRows}
        </div>
        ${
          productCanRate
            ? `<button type="button" class="rating-action-button" data-edit-my-review="${escapeHtml(ratingEditorId)}" aria-expanded="false">${userHasRating ? "Edit my rating" : "Rate product"} ${ratingUserBadge}</button>`
            : ratingAccessNotice
        }
      </div>
      <form id="${escapeHtml(ratingEditorId)}" class="rating-editor-form" data-product-review-form data-review-mode="rating" data-product-review-product="${escapeHtml(options.item?.id || "")}" data-product-can-rate="${productCanRate ? "1" : "0"}" hidden>
        <div class="rating-editor-head">
          <p>${state.sessionAuthenticated ? `Dear ${escapeHtml(sessionUserName)}, ${productCanRate ? "you have purchased this product. What do you think about this product?" : "only verified buyers can rate this product."}` : "Please log in to rate this product."}</p>
          <button type="button" class="review-card-action" data-review-cancel aria-label="Close rating editor">x</button>
        </div>
        ${reviewRatingControls}
        ${reviewFormNotice}
        <button type="submit" class="rating-submit-button" data-review-submit disabled>Submit ${ratingUserBadge}</button>
      </form>
    </section>
  `;
}
