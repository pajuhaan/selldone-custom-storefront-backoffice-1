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

function reviewDateLabel(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function reviewBelongsToCurrentUser(review, options = {}) {
  const { state, firstNonNull, currentUserId, currentUserName } = options;
  if (!state.sessionAuthenticated || !review) return false;
  if (review?.isMine || review?.is_mine || review?.mine || review?.my_review || review?.myReview) return true;
  const reviewUserId = String(
    firstNonNull(
      review?.userId,
      review?.user_id,
      review?.user?.id,
      review?.customer_id,
      review?.customerId,
      review?.customer?.id,
      review?.profile_id,
      review?.profileId,
      review?.profile?.id,
      review?.author_id,
      review?.authorId,
      review?.author?.id,
      review?.raw?.user_id,
      review?.raw?.userId,
      review?.payload?.user_id,
      "",
    ) || "",
  ).trim();
  if (currentUserId && reviewUserId && reviewUserId === currentUserId) return true;
  const reviewName = String(review?.name || "").trim().toLowerCase();
  return Boolean(currentUserName && reviewName && reviewName === currentUserName);
}

function renderReviewRatingSnapshot(review, options = {}) {
  const { productRatingCriteria, escapeHtml, firstNonNull } = options;
  const reviewRatings = firstNonNull(review?.ratings, review?.user_rating, review?.userRating, review?.my_rating, review?.myRating, review?.my_ratings, review?.myRatings, null);
  const reviewRatingList = Array.isArray(reviewRatings) ? reviewRatings : [];
  const criteria = productRatingCriteria.length ? productRatingCriteria : reviewRatingList;
  const selectedValueForCriterion = (criterionId = "", label = "") => {
    const keys = [criterionId, label].map((entry) => String(entry || "").trim()).filter(Boolean);
    if (!keys.length || !reviewRatings) return 0;
    if (Array.isArray(reviewRatings)) {
      const match = reviewRatings.find((ratingEntry) => {
        const ratingKeys = [
          ratingEntry?.id,
          ratingEntry?.rating_id,
          ratingEntry?.ratingId,
          ratingEntry?.rate_id,
          ratingEntry?.rateId,
          ratingEntry?.product_rating_id,
          ratingEntry?.productRatingId,
          ratingEntry?.key,
          ratingEntry?.name,
          ratingEntry?.title,
          ratingEntry?.label,
        ]
          .map((entry) => String(entry || "").trim())
          .filter(Boolean);
        return ratingKeys.some((entryKey) => keys.includes(entryKey));
      });
      const value = Number(firstNonNull(match?.value, match?.rate, match?.rating, match?.score, 0));
      return Number.isFinite(value) ? Math.max(0, Math.min(5, Math.round(value))) : 0;
    }
    if (typeof reviewRatings === "object") {
      const rawValue = keys.map((key) => reviewRatings[key]).find((entry) => entry != null) ?? 0;
      const value = Number(
        rawValue && typeof rawValue === "object"
          ? firstNonNull(rawValue.value, rawValue.rate, rawValue.rating, rawValue.score, rawValue.point, rawValue.points, rawValue.stars, 0)
          : rawValue,
      );
      return Number.isFinite(value) ? Math.max(0, Math.min(5, Math.round(value))) : 0;
    }
    return 0;
  };
  const rows = criteria
    .map((criterion, index) => {
      const criterionId = String(firstNonNull(criterion?.id, criterion?.rating_id, criterion?.ratingId, criterion?.key, criterion?.name, index + 1) || "").trim();
      const label = String(firstNonNull(criterion?.name, criterion?.title, criterion?.label, criterionId, `Rating ${index + 1}`) || "").trim();
      const value = selectedValueForCriterion(criterionId, label);
      if (!Number.isFinite(value) || value <= 0) return "";
      const safeValue = Math.max(1, Math.min(5, Math.round(value)));
      return `
        <div class="review-comment-rating-row">
          <span>${escapeHtml(label)}</span>
          <b><i style="--rating-progress: ${safeValue * 20}%"></i></b>
          <em>${escapeHtml(reviewQualityLabel(safeValue))}</em>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");
  return rows ? `<div class="review-comment-ratings">${rows}</div>` : "";
}

function reviewAverageRatingValue(review, options = {}) {
  const { firstNonNull } = options;
  const reviewRatings = firstNonNull(review?.ratings, review?.user_rating, review?.userRating, review?.my_rating, review?.myRating, review?.my_ratings, review?.myRatings, null);
  const values = [];
  const addValue = (value) => {
    const numeric = Number(
      value && typeof value === "object"
        ? firstNonNull(value.value, value.rate, value.rating, value.score, value.point, value.points, value.stars, 0)
        : value,
    );
    if (Number.isFinite(numeric) && numeric > 0) values.push(Math.max(1, Math.min(5, numeric)));
  };

  if (Array.isArray(reviewRatings)) {
    reviewRatings.forEach(addValue);
  } else if (reviewRatings && typeof reviewRatings === "object") {
    Object.values(reviewRatings).forEach(addValue);
  }

  if (values.length) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  const fallback = Number(review?.rating || review?.rate || review?.score || 0);
  return Number.isFinite(fallback) && fallback > 0 ? Math.max(1, Math.min(5, fallback)) : 0;
}

export function renderProductCommentsSection(options = {}) {
  const {
    escapeHtml,
    firstNonNull,
    reviewStarsMarkup,
    state,
    reviewCards,
    productRatingCriteria,
    hasExistingUserReview,
    ownReviewComment,
    commentEditorId,
    reviewFormNotice,
    item,
  } = options;

  const currentUserId = String(
    firstNonNull(
      state.sessionUser?.id,
      state.sessionUser?.user_id,
      state.sessionUser?.userId,
      state.sessionUser?.customer_id,
      state.sessionUser?.customerId,
      state.sessionUser?.customer?.id,
      state.sessionUser?.profile_id,
      state.sessionUser?.profileId,
      state.sessionUser?.profile?.id,
      state.sessionUser?.user?.id,
      "",
    ) || "",
  ).trim();
  const currentUserName = String(firstNonNull(state.sessionUser?.name, state.sessionUser?.username, state.sessionUser?.email, "") || "")
    .trim()
    .toLowerCase();
  const belongsOptions = { state, firstNonNull, currentUserId, currentUserName };
  const orderedReviewCards = [...reviewCards].sort((a, b) => Number(reviewBelongsToCurrentUser(b, belongsOptions)) - Number(reviewBelongsToCurrentUser(a, belongsOptions)));
  const hasComments = orderedReviewCards.length > 0;
  const ownCommentReview = orderedReviewCards.find((review) => reviewBelongsToCurrentUser(review, belongsOptions) && String(review?.comment || "").trim());
  const hasOwnComment = Boolean(ownCommentReview || String(ownReviewComment || "").trim());
  const ownCommentId = String(firstNonNull(ownCommentReview?.id, item?.myReview?.id, item?.myReview?.comment_id, item?.myReview?.commentId, "") || "").trim();
  const commentComposerMarkup = `
    <button type="button" class="comment-composer-card" data-edit-my-review="${escapeHtml(commentEditorId)}" aria-expanded="false">
      <span>${hasOwnComment ? '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 20h4.3L19.1 9.2l-4.3-4.3L4 15.7V20Zm2-3.5 8.8-8.8 1.5 1.5L7.5 18H6v-1.5ZM16 3.7l4.3 4.3 1.2-1.2a2 2 0 0 0 0-2.8L20 2.5a2 2 0 0 0-2.8 0L16 3.7Z" /></svg>' : "+"}</span>
      <strong>${hasOwnComment ? "Edit my comment" : "Click to leave a comment .."}</strong>
      <small>${hasOwnComment ? "Update your previous product comment." : "One comment per product. Edit your previous comment when needed."}</small>
    </button>
    <form id="${escapeHtml(commentEditorId)}" class="comment-editor-form" data-product-review-form data-review-mode="comment" data-product-review-product="${escapeHtml(item.id)}" data-product-review-comment-id="${escapeHtml(ownCommentId)}" data-product-can-rate="0" hidden>
      <label class="review-text-field">
        Comment
        <textarea name="comment" rows="5" required placeholder="Write your experience with this product">${ownReviewComment ? escapeHtml(ownReviewComment) : ""}</textarea>
      </label>
      ${reviewFormNotice}
      <div class="comment-editor-actions">
        <button type="button" class="plain-action-button" data-review-cancel>Cancel</button>
        <button type="submit" class="comment-save-button" data-review-submit disabled>Save</button>
      </div>
    </form>
  `;
  const reviewCardsMarkup = hasComments
    ? orderedReviewCards
        .slice(0, 6)
        .map((review) => {
          const rawReviewName = String(firstNonNull(review.name, review.userName, review.user_name, review.user?.name, review.customer?.name, reviewBelongsToCurrentUser(review, belongsOptions) ? firstNonNull(state.sessionUser?.name, state.sessionUser?.username, state.sessionUser?.email, null) : null, "Pajulina member") || "Pajulina member").trim();
          const reviewName = escapeHtml(rawReviewName);
          const reviewInitials = escapeHtml(
            rawReviewName
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part.charAt(0))
              .join("")
              .toUpperCase() || "?",
          );
          const reviewAvatarUrl = String(review.avatarUrl || "").trim();
          const reviewAvatar = reviewAvatarUrl ? `<img src="${escapeHtml(reviewAvatarUrl)}" alt="" loading="lazy" />` : reviewInitials;
          const reviewComment = String(review.comment || "").trim();
          const reviewDate = reviewDateLabel(review.createdAt);
          const isOwnReview = reviewBelongsToCurrentUser(review, belongsOptions);
          const reviewForRatings =
            isOwnReview && !Array.isArray(review.ratings) && item?.myRating
              ? { ...review, ratings: item.myRating }
              : isOwnReview && Array.isArray(review.ratings) && !review.ratings.length && item?.myRating
                ? { ...review, ratings: item.myRating }
                : review;
          const reviewRatingsMarkup = renderReviewRatingSnapshot(reviewForRatings, { productRatingCriteria, escapeHtml, firstNonNull });
          const reviewAverageRating = reviewAverageRatingValue(reviewForRatings, { firstNonNull });
          const reviewScoreMarkup =
            reviewRatingsMarkup || reviewAverageRating
              ? `
                <div class="review-comment-score-row">
                  ${reviewRatingsMarkup}
                  ${reviewAverageRating ? `<span class="review-card-stars">${reviewStarsMarkup(reviewAverageRating)}</span>` : ""}
                </div>
              `
              : "";
          return `
            <article class="review-card">
              <div class="review-comment-top">
                <div class="review-card-head">
                  <span class="review-avatar" aria-hidden="true">${reviewAvatar}</span>
                  <div class="review-comment-author">
                    <div class="review-comment-name-line">
                      <h3>${reviewName}</h3>
                      ${isOwnReview ? `<span class="review-owner-badge">Your comment</span>` : ""}
                      ${review.verified ? `<span class="review-buyer-badge">Verified Buyer</span>` : ""}
                    </div>
                    <span class="review-comment-date">${reviewDate ? `On ${escapeHtml(reviewDate)}` : "Recently"}</span>
                  </div>
                </div>
                <div class="review-card-actions">
                  ${isOwnReview ? `
                    <button type="button" class="review-card-action review-card-action-edit" data-edit-my-review="${escapeHtml(commentEditorId)}" aria-label="Edit my comment" title="Edit comment">
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 20h4.3L19.1 9.2l-4.3-4.3L4 15.7V20Zm2-3.5 8.8-8.8 1.5 1.5L7.5 18H6v-1.5ZM16 3.7l4.3 4.3 1.2-1.2a2 2 0 0 0 0-2.8L20 2.5a2 2 0 0 0-2.8 0L16 3.7Z" /></svg>
                      <span>Edit</span>
                    </button>
                    ${review.id ? `
                      <button type="button" class="review-card-action review-card-action-delete" data-delete-my-review data-delete-review-product="${escapeHtml(item.id)}" data-delete-review-comment-id="${escapeHtml(review.id)}" aria-label="Delete my comment" title="Delete comment">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 21a2 2 0 0 1-2-2V8H5a1 1 0 0 1 0-2h4V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1h4a1 1 0 1 1 0 2h-1v11a2 2 0 0 1-2 2H8Zm3-15h2V5h-2v1Zm-3 2v11h8V8H8Zm2 2h2v7h-2v-7Zm4 0h2v7h-2v-7Z" /></svg>
                        <span>Delete</span>
                      </button>
                    ` : ""}
                  ` : ""}
                </div>
              </div>
              ${reviewScoreMarkup}
              <p class="review-comment-body">${reviewComment ? escapeHtml(reviewComment) : "No review text provided."}</p>
            </article>
          `;
        })
        .join("")
    : `<p class="comments-empty-state">No comments yet.</p>`;

  return `
    <section class="comments-section" id="reviews">
      ${commentComposerMarkup}
      ${hasComments ? `<h2>Reviews</h2>` : ""}
      ${reviewCardsMarkup}
    </section>
  `;
}
