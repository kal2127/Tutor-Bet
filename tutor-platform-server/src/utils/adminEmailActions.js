function adminActionButton(label) {
  return `
    <p style="margin: 24px 0;">
      <strong>${label}</strong>
    </p>
    <p style="font-size: 13px; color: #6b625c;">
      Please open the admin dashboard manually to complete this action.
    </p>
  `;
}

module.exports = {
  adminActionButton,
};
