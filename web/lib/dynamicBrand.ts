// Chatter-branded Dynamic auth modal: CSS variables (globals.css) + shadow-DOM overrides + copy.
// Docs: https://www.dynamic.xyz/docs/react/using-our-ui/design-customizations/css/css-variables

export const DYNAMIC_CSS_OVERRIDES = `
  /* Brutalist modal shell */
  [class*="modal-card"],
  [class*="ModalCard"],
  [class*="auth-modal"],
  [class*="modal-layout"] {
    background: #efe9e0 !important;
    box-shadow: 6px 6px 0 #111 !important;
    border-radius: 16px !important;
  }

  /* Email: dense Input mirrors label into placeholder — hide placeholder, keep floating label */
  .login-with-email-form input::placeholder,
  .input__container--dense input::placeholder {
    color: transparent !important;
    opacity: 0 !important;
  }

  /* Email + OTP inputs */
  input[type="email"],
  input[type="text"],
  input[type="tel"] {
    background: #efe9e0 !important;
    border: 2px solid #111 !important;
    border-radius: 10px !important;
    color: #111 !important;
    font-family: var(--font-geist-mono), ui-monospace, monospace !important;
  }

  /* Continue / primary actions — coral when active */
  button[class*="primary"],
  button[class*="continue"],
  button[class*="submit"]:not([class*="wallet"]) {
    border: 2px solid #111 !important;
    border-radius: 10px !important;
    font-weight: 700 !important;
    box-shadow: 0 3px 0 #111 !important;
  }

  button[class*="primary"]:not(:disabled),
  button[class*="continue"]:not(:disabled) {
    background: #f0503c !important;
    color: #fff !important;
  }

  button[class*="primary"]:disabled,
  button[class*="continue"]:disabled {
    background: #f4a6c8 !important;
    color: rgba(17, 17, 17, 0.45) !important;
    box-shadow: none !important;
  }

  /* Wallet list scroll area — room for bottom tile shadow (overflow:auto clips box-shadow) */
  .login-view__scroll {
    padding-bottom: 8px !important;
  }

  .login-with-email-wallet-list__container {
    padding-bottom: 8px !important;
  }

  /* Wallet tiles */
  .wallet-list-item__tile,
  .list-item-button.list-tile,
  .login-with-email-wallet-list__container button {
    background: #fff !important;
    border: 2px solid #111 !important;
    border-radius: 12px !important;
    box-shadow: 0 3px 0 #111 !important;
    color: #111 !important;
  }

  .wallet-list-item__tile:hover,
  .list-item-button.list-tile:hover,
  .login-with-email-wallet-list__container button:hover {
    background: #f4a6c8 !important;
    transform: translate(1px, 1px);
    box-shadow: 0 2px 0 #111 !important;
  }

  /* Title weight */
  h1, h2, [class*="title"] {
    font-weight: 900 !important;
    letter-spacing: -0.02em !important;
  }
`;

export const DYNAMIC_LOCALE = {
  en: {
    dyn_login: {
      title: {
        all: "Join Chatter",
        all_wallet_list: "Connect a wallet",
        wallet_only: "Connect your wallet",
      },
      email_form: {
        submit_button: {
          label: "Continue",
        },
      },
    },
  },
};
