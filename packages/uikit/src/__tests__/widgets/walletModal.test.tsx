import React from "react";
import noop from "lodash/noop";
import { renderWithTheme } from "../../testHelpers";
import ConnectModal from "../../widgets/WalletModal/ConnectModal";

it("renders ConnectModal correctly", () => {
  const { asFragment } = renderWithTheme(<ConnectModal login={noop} t={(key: string) => key} />);
  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      .c0 {
      min-width: 320px;
    }

    .c10 {
      width: 320px;
    }

    .c12 {
      max-height: 453px;
      overflow-y: auto;
      padding-top: 24px;
      padding-bottom: 24px;
    }

    .c21 {
      padding: 24px;
    }

    .c14 {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .c5 {
      color: #280D5F;
      font-weight: 600;
      line-height: 1.5;
      font-size: 16px;
    }

    .c18 {
      color: #280D5F;
      font-weight: 400;
      line-height: 1.5;
      font-size: 14px;
    }

    .c22 {
      color: #7A6EAA;
      font-weight: 400;
      line-height: 1.5;
      margin-bottom: 16px;
      text-align: center;
      font-size: 16px;
    }

    .c6 {
      font-size: 20px;
      font-weight: 600;
      line-height: 1.1;
    }

    .c7 {
      -webkit-align-items: center;
      -webkit-box-align: center;
      -ms-flex-align: center;
      align-items: center;
      border: 0;
      border-radius: 16px;
      box-shadow: 0px -1px 0px 0px rgba(14,14,44,0.4) inset;
      cursor: pointer;
      display: -webkit-inline-box;
      display: -webkit-inline-flex;
      display: -ms-inline-flexbox;
      display: inline-flex;
      font-family: inherit;
      font-size: 16px;
      font-weight: 600;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      -ms-flex-pack: center;
      justify-content: center;
      -webkit-letter-spacing: 0.03em;
      -moz-letter-spacing: 0.03em;
      -ms-letter-spacing: 0.03em;
      letter-spacing: 0.03em;
      line-height: 1;
      opacity: 1;
      outline: 0;
      -webkit-transition: background-color 0.2s,opacity 0.2s;
      transition: background-color 0.2s,opacity 0.2s;
      height: 48px;
      padding: 0 24px;
      background-color: transparent;
      color: #E91E63;
      box-shadow: none;
    }

    .c7:hover:not(:disabled):not(.pancake-button--disabled):not(.pancake-button--disabled):not(:active) {
      opacity: 0.65;
    }

    .c7:active:not(:disabled):not(.pancake-button--disabled):not(.pancake-button--disabled) {
      opacity: 0.85;
      -webkit-transform: translateY(1px);
      -ms-transform: translateY(1px);
      transform: translateY(1px);
      box-shadow: none;
    }

    .c7:disabled,
    .c7.pancake-button--disabled {
      background-color: #E9EAEB;
      border-color: #E9EAEB;
      box-shadow: none;
      color: #BDC2C4;
      cursor: not-allowed;
    }

    .c15 {
      -webkit-align-items: center;
      -webkit-box-align: center;
      -ms-flex-align: center;
      align-items: center;
      border: 0;
      border-radius: 16px;
      box-shadow: 0px -1px 0px 0px rgba(14,14,44,0.4) inset;
      cursor: pointer;
      display: -webkit-inline-box;
      display: -webkit-inline-flex;
      display: -ms-inline-flexbox;
      display: inline-flex;
      font-family: inherit;
      font-size: 16px;
      font-weight: 600;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      -ms-flex-pack: center;
      justify-content: center;
      -webkit-letter-spacing: 0.03em;
      -moz-letter-spacing: 0.03em;
      -ms-letter-spacing: 0.03em;
      letter-spacing: 0.03em;
      line-height: 1;
      opacity: 1;
      outline: 0;
      -webkit-transition: background-color 0.2s,opacity 0.2s;
      transition: background-color 0.2s,opacity 0.2s;
      height: 48px;
      padding: 0 24px;
      background-color: transparent;
      color: #E91E63;
      box-shadow: none;
      width: 100%;
      padding-top: 16px;
      padding-bottom: 16px;
    }

    .c15:hover:not(:disabled):not(.pancake-button--disabled):not(.pancake-button--disabled):not(:active) {
      opacity: 0.65;
    }

    .c15:active:not(:disabled):not(.pancake-button--disabled):not(.pancake-button--disabled) {
      opacity: 0.85;
      -webkit-transform: translateY(1px);
      -ms-transform: translateY(1px);
      transform: translateY(1px);
      box-shadow: none;
    }

    .c15:disabled,
    .c15.pancake-button--disabled {
      background-color: #E9EAEB;
      border-color: #E9EAEB;
      box-shadow: none;
      color: #BDC2C4;
      cursor: not-allowed;
    }

    .c23 {
      -webkit-align-items: center;
      -webkit-box-align: center;
      -ms-flex-align: center;
      align-items: center;
      border: 0;
      border-radius: 16px;
      box-shadow: 0px -1px 0px 0px rgba(14,14,44,0.4) inset;
      cursor: pointer;
      display: -webkit-inline-box;
      display: -webkit-inline-flex;
      display: -ms-inline-flexbox;
      display: inline-flex;
      font-family: inherit;
      font-size: 16px;
      font-weight: 600;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      -ms-flex-pack: center;
      justify-content: center;
      -webkit-letter-spacing: 0.03em;
      -moz-letter-spacing: 0.03em;
      -ms-letter-spacing: 0.03em;
      letter-spacing: 0.03em;
      line-height: 1;
      opacity: 1;
      outline: 0;
      -webkit-transition: background-color 0.2s,opacity 0.2s;
      transition: background-color 0.2s,opacity 0.2s;
      height: 48px;
      padding: 0 24px;
      background-color: #7A6EAA;
      color: #FFFFFF;
      width: 100%;
    }

    .c23:hover:not(:disabled):not(.pancake-button--disabled):not(.pancake-button--disabled):not(:active) {
      opacity: 0.65;
    }

    .c23:active:not(:disabled):not(.pancake-button--disabled):not(.pancake-button--disabled) {
      opacity: 0.85;
      -webkit-transform: translateY(1px);
      -ms-transform: translateY(1px);
      transform: translateY(1px);
      box-shadow: none;
    }

    .c23:disabled,
    .c23.pancake-button--disabled {
      background-color: #E9EAEB;
      border-color: #E9EAEB;
      box-shadow: none;
      color: #BDC2C4;
      cursor: not-allowed;
    }

    .c8 {
      padding: 0;
      width: 48px;
    }

    .c9 {
      -webkit-align-self: center;
      -ms-flex-item-align: center;
      align-self: center;
      fill: #E91E63;
      -webkit-flex-shrink: 0;
      -ms-flex-negative: 0;
      flex-shrink: 0;
    }

    .c17 {
      -webkit-align-self: center;
      -ms-flex-item-align: center;
      align-self: center;
      fill: #280D5F;
      -webkit-flex-shrink: 0;
      -ms-flex-negative: 0;
      flex-shrink: 0;
      margin-bottom: 8px;
    }

    .c19 {
      -webkit-align-self: center;
      -ms-flex-item-align: center;
      align-self: center;
      fill: #280D5F;
      -webkit-flex-shrink: 0;
      -ms-flex-negative: 0;
      flex-shrink: 0;
    }

    .c20 {
      -webkit-align-self: center;
      -ms-flex-item-align: center;
      align-self: center;
      fill: #7A6EAA;
      -webkit-flex-shrink: 0;
      -ms-flex-negative: 0;
      flex-shrink: 0;
      margin-bottom: 8px;
    }

    .c3 {
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
    }

    .c2 {
      -webkit-align-items: center;
      -webkit-box-align: center;
      -ms-flex-align: center;
      align-items: center;
      background: linear-gradient(139.73deg,#E5FDFF 0%,#F3EFFF 100%);
      border-bottom: 1px solid #E7E3EB;
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      padding: 12px 24px;
    }

    .c4 {
      -webkit-align-items: center;
      -webkit-box-align: center;
      -ms-flex-align: center;
      align-items: center;
      -webkit-flex: 1;
      -ms-flex: 1;
      flex: 1;
    }

    .c11 {
      -webkit-flex-direction: column;
      -ms-flex-direction: column;
      flex-direction: column;
      max-height: 90vh;
      overflow-y: auto;
    }

    .c1 {
      overflow: hidden;
      background: #FFFFFF;
      box-shadow: 0px 20px 36px -8px rgba(14,14,44,0.1),0px 1px 1px rgba(0,0,0,0.05);
      border: 1px solid #E7E3EB;
      border-radius: 32px;
      width: 100%;
      max-height: 100vh;
      z-index: 100;
    }

    .c16 {
      -webkit-align-items: center;
      -webkit-box-align: center;
      -ms-flex-align: center;
      align-items: center;
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-flex-direction: column;
      -ms-flex-direction: column;
      flex-direction: column;
      height: auto;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      -ms-flex-pack: center;
      justify-content: center;
      margin-left: auto;
      margin-right: auto;
    }

    .c13 {
      border-bottom: 1px solid #E7E3EB;
    }

    @media screen and (min-width:370px) {

    }

    @media screen and (min-width:576px) {
      .c10 {
        width: 340px;
      }
    }

    @media screen and (min-width:968px) {
      .c6 {
        font-size: 20px;
      }
    }

    @supports (-webkit-text-size-adjust:none) and (not (-ms-accelerator:true)) and (not (-moz-appearance:none)) {
      .c9 {
        -webkit-filter: none !important;
        filter: none !important;
      }
    }

    @supports (-webkit-text-size-adjust:none) and (not (-ms-accelerator:true)) and (not (-moz-appearance:none)) {
      .c17 {
        -webkit-filter: none !important;
        filter: none !important;
      }
    }

    @supports (-webkit-text-size-adjust:none) and (not (-ms-accelerator:true)) and (not (-moz-appearance:none)) {
      .c19 {
        -webkit-filter: none !important;
        filter: none !important;
      }
    }

    @supports (-webkit-text-size-adjust:none) and (not (-ms-accelerator:true)) and (not (-moz-appearance:none)) {
      .c20 {
        -webkit-filter: none !important;
        filter: none !important;
      }
    }

    @media screen and (min-width:370px) {
      .c1 {
        width: auto;
        min-width: 320px;
        max-width: 100%;
      }
    }

    <div
        class="c0 c1"
      >
        <div
          class="c2"
        >
          <div
            class="c3 c4"
          >
            <h2
              class="c5 c6"
              color="text"
              font-size="16px"
            >
              Connect Wallet
            </h2>
          </div>
          <button
            aria-label="Close the dialog"
            class="c7 c8"
            scale="md"
          >
            <svg
              class="c9"
              color="primary"
              viewBox="0 0 24 24"
              width="20px"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18.3 5.70997C17.91 5.31997 17.28 5.31997 16.89 5.70997L12 10.59L7.10997 5.69997C6.71997 5.30997 6.08997 5.30997 5.69997 5.69997C5.30997 6.08997 5.30997 6.71997 5.69997 7.10997L10.59 12L5.69997 16.89C5.30997 17.28 5.30997 17.91 5.69997 18.3C6.08997 18.69 6.71997 18.69 7.10997 18.3L12 13.41L16.89 18.3C17.28 18.69 17.91 18.69 18.3 18.3C18.69 17.91 18.69 17.28 18.3 16.89L13.41 12L18.3 7.10997C18.68 6.72997 18.68 6.08997 18.3 5.70997Z"
              />
            </svg>
          </button>
        </div>
        <div
          class="c10 c3 c11"
          width="320px,,340px"
        >
          <div
            class="c12 c13"
          >
            <div
              class="c14"
            >
              <div
                class=""
              >
                <button
                  class="c15 c16"
                  id="wallet-connect-okx wallet"
                  scale="md"
                  width="100%"
                >
                  <svg
                    class="c17"
                    color="text"
                    viewBox="0 0 100 100"
                    width="40px"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0 0 H33.33 V33.33 H0 Z"
                      fill="black"
                    />
                    <path
                      d="M33.33 0 H66.67 V33.33 H33.33 Z"
                      fill="white"
                    />
                    <path
                      d="M66.67 0 H100 V33.33 H66.67 Z"
                      fill="black"
                    />
                    <path
                      d="M0 33.33 H33.33 V66.67 H0 Z"
                      fill="white"
                    />
                    <path
                      d="M33.33 33.33 H66.67 V66.67 H33.33 Z"
                      fill="black"
                    />
                    <path
                      d="M66.67 33.33 H100 V66.67 H66.67 Z"
                      fill="white"
                    />
                    <path
                      d="M0 66.67 H33.33 V100 H0 Z"
                      fill="black"
                    />
                    <path
                      d="M33.33 66.67 H66.67 V100 H33.33 Z"
                      fill="white"
                    />
                    <path
                      d="M66.67 66.67 H100 V100 H66.67 Z"
                      fill="black"
                    />
                  </svg>
                  <div
                    class="c18"
                    color="text"
                    font-size="14px"
                  >
                    OKX Wallet
                  </div>
                </button>
              </div>
              <div
                class=""
              >
                <button
                  class="c15 c16"
                  id="wallet-connect-bitkeep wallet"
                  scale="md"
                  width="100%"
                >
                  <svg
                    class="c19"
                    color="text"
                    fill="none"
                    height="45"
                    viewBox="0 0 36 36"
                    width="45"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 0C27.942 0 36 8.05967 36 18C36 27.942 27.942 36 18 36C8.05967 36 0 27.9413 0 18C0 8.05967 8.05967 0 18 0Z"
                      fill="#7524F9"
                    />
                    <path
                      clip-rule="evenodd"
                      d="M28 13.1817V14.2863C28.0002 14.3931 27.9714 14.4981 27.9165 14.5907C27.8616 14.6833 27.7826 14.7601 27.6875 14.8135L24.0242 16.8686L27.2969 18.6995C27.5108 18.8196 27.6884 18.9924 27.8118 19.2005C27.9353 19.4085 28.0002 19.6445 28 19.8847V22.8302C28.0003 23.0705 27.9355 23.3066 27.812 23.5148C27.6886 23.723 27.5109 23.8959 27.2969 24.0161L18.6898 28.8168C18.4761 28.9368 18.2336 29 17.9867 29C17.7399 29 17.4974 28.9368 17.2836 28.8168L14.4672 27.235C14.4196 27.2084 14.3802 27.17 14.3527 27.1238C14.3253 27.0776 14.3108 27.0252 14.3108 26.9718C14.3108 26.9184 14.3253 26.866 14.3527 26.8198C14.3802 26.7736 14.4196 26.7352 14.4672 26.7086L23.7641 21.5052C23.7877 21.4918 23.8074 21.4727 23.8211 21.4496C23.8347 21.4265 23.8419 21.4004 23.8419 21.3738C23.8419 21.3472 23.8347 21.321 23.8211 21.2979C23.8074 21.2749 23.7877 21.2557 23.7641 21.2423L20.3125 19.3035C20.2175 19.2502 20.1097 19.2221 20 19.2221C19.8903 19.2221 19.7825 19.2502 19.6875 19.3035L10.2445 24.5927C10.1733 24.6327 10.0924 24.6538 10.0102 24.6538C9.92788 24.6538 9.84704 24.6327 9.77578 24.5927L8.70625 23.9979C8.4913 23.8779 8.31277 23.7048 8.18875 23.4961C8.06472 23.2875 7.99961 23.0507 8 22.8096V21.6055C7.99995 21.5254 8.02158 21.4468 8.06273 21.3774C8.10387 21.3081 8.16307 21.2505 8.23438 21.2104L21.7734 13.6443C21.7971 13.631 21.8168 13.6118 21.8304 13.5887C21.8441 13.5657 21.8513 13.5395 21.8513 13.5129C21.8513 13.4863 21.8441 13.4601 21.8304 13.4371C21.8168 13.414 21.7971 13.3948 21.7734 13.3815L18.3164 11.4358C18.2214 11.3825 18.1136 11.3544 18.0039 11.3544C17.8942 11.3544 17.7864 11.3825 17.6914 11.4358L8.46875 16.5936C8.42127 16.6202 8.36741 16.6343 8.31258 16.6343C8.25775 16.6343 8.20389 16.6203 8.15639 16.5937C8.10889 16.567 8.06944 16.5287 8.04199 16.4826C8.01454 16.4364 8.00006 16.384 8 16.3307V13.1672C7.99971 12.9269 8.06454 12.6907 8.18798 12.4825C8.31142 12.2743 8.4891 12.1015 8.70313 11.9813L17.3086 7.18212C17.5219 7.0628 17.7637 7 18.0098 7C18.2558 7 18.4976 7.0628 18.7109 7.18212L27.2969 11.998C27.5106 12.118 27.688 12.2905 27.8114 12.4983C27.9349 12.706 27.9999 12.9417 28 13.1817Z"
                      fill="white"
                      fill-rule="evenodd"
                    />
                  </svg>
                  <div
                    class="c18"
                    color="text"
                    font-size="14px"
                  >
                    BitKeep Wallet
                  </div>
                </button>
              </div>
              <div
                class=""
              >
                <button
                  class="c15 c16"
                  id="wallet-connect-metamask"
                  scale="md"
                  width="100%"
                >
                  <svg
                    class="c17"
                    color="text"
                    viewBox="0 0 40 40"
                    width="40px"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M36.0112 3.33337L22.1207 13.6277L24.7012 7.56091L36.0112 3.33337Z"
                      fill="#E17726"
                    />
                    <path
                      d="M4.00261 3.33337L17.7558 13.7238L15.2989 7.56091L4.00261 3.33337Z"
                      fill="#E27625"
                    />
                    <path
                      d="M31.0149 27.2023L27.3227 32.8573L35.2287 35.0397L37.4797 27.3258L31.0149 27.2023Z"
                      fill="#E27625"
                    />
                    <path
                      d="M2.53386 27.3258L4.77116 35.0397L12.6772 32.8573L8.9987 27.2023L2.53386 27.3258Z"
                      fill="#E27625"
                    />
                    <path
                      d="M12.2518 17.6496L10.0419 20.9712L17.8793 21.3281L17.6048 12.8867L12.2518 17.6496Z"
                      fill="#E27625"
                    />
                    <path
                      d="M27.762 17.6494L22.3129 12.7905L22.1207 21.3279L29.9581 20.9711L27.762 17.6494Z"
                      fill="#E27625"
                    />
                    <path
                      d="M12.6772 32.8574L17.3989 30.5652L13.336 27.3809L12.6772 32.8574Z"
                      fill="#E27625"
                    />
                    <path
                      d="M22.6009 30.5652L27.3226 32.8574L26.6637 27.3809L22.6009 30.5652Z"
                      fill="#E27625"
                    />
                    <path
                      d="M27.3226 32.8575L22.6009 30.5653L22.9715 33.6399L22.9303 34.9301L27.3226 32.8575Z"
                      fill="#D5BFB2"
                    />
                    <path
                      d="M12.6772 32.8575L17.0694 34.9301L17.042 33.6399L17.3989 30.5653L12.6772 32.8575Z"
                      fill="#D5BFB2"
                    />
                    <path
                      d="M17.1518 25.3495L13.2262 24.1965L15.9988 22.92L17.1518 25.3495Z"
                      fill="#233447"
                    />
                    <path
                      d="M22.848 25.3495L24.001 22.92L26.801 24.1965L22.848 25.3495Z"
                      fill="#233447"
                    />
                    <path
                      d="M12.6773 32.8573L13.3635 27.2023L8.99876 27.3258L12.6773 32.8573Z"
                      fill="#CC6228"
                    />
                    <path
                      d="M26.6364 27.2023L27.3227 32.8573L31.0149 27.3258L26.6364 27.2023Z"
                      fill="#CC6228"
                    />
                    <path
                      d="M29.9581 20.9709L22.1207 21.3278L22.8482 25.3495L24.0011 22.92L26.8012 24.1965L29.9581 20.9709Z"
                      fill="#CC6228"
                    />
                    <path
                      d="M13.2263 24.1965L15.9989 22.92L17.1519 25.3495L17.8793 21.3278L10.0419 20.9709L13.2263 24.1965Z"
                      fill="#CC6228"
                    />
                    <path
                      d="M10.0419 20.9709L13.3361 27.3809L13.2263 24.1965L10.0419 20.9709Z"
                      fill="#E27525"
                    />
                    <path
                      d="M26.8011 24.1965L26.6638 27.3809L29.958 20.9709L26.8011 24.1965Z"
                      fill="#E27525"
                    />
                    <path
                      d="M17.8793 21.3278L17.1519 25.3494L18.0715 30.0985L18.2637 23.8396L17.8793 21.3278Z"
                      fill="#E27525"
                    />
                    <path
                      d="M22.1205 21.3278L21.7499 23.8258L21.9283 30.0985L22.848 25.3494L22.1205 21.3278Z"
                      fill="#E27525"
                    />
                    <path
                      d="M22.848 25.3496L21.9284 30.0987L22.601 30.5654L26.6638 27.381L26.8011 24.1967L22.848 25.3496Z"
                      fill="#F5841F"
                    />
                    <path
                      d="M13.2262 24.1967L13.336 27.381L17.3989 30.5654L18.0714 30.0987L17.1518 25.3496L13.2262 24.1967Z"
                      fill="#F5841F"
                    />
                    <path
                      d="M22.9303 34.93L22.9715 33.6398L22.6284 33.3378H17.3714L17.042 33.6398L17.0694 34.93L12.6772 32.8574L14.2145 34.1202L17.3302 36.2751H22.6696L25.7853 34.1202L27.3226 32.8574L22.9303 34.93Z"
                      fill="#C0AC9D"
                    />
                    <path
                      d="M22.601 30.5653L21.9284 30.0986H18.0715L17.3989 30.5653L17.0421 33.6399L17.3715 33.3379H22.6285L22.9716 33.6399L22.601 30.5653Z"
                      fill="#161616"
                    />
                    <path
                      d="M36.5875 14.3003L37.7542 8.61779L36.011 3.33337L22.6009 13.2846L27.7618 17.6493L35.0365 19.7768L36.6424 17.8964L35.9424 17.3886L37.0679 16.3728L36.2169 15.7003L37.3287 14.863L36.5875 14.3003Z"
                      fill="#763E1A"
                    />
                    <path
                      d="M2.24573 8.61779L3.42615 14.3003L2.67123 14.863L3.78302 15.7003L2.93202 16.3728L4.05753 17.3886L3.35752 17.8964L4.96343 19.7768L12.2518 17.6493L17.399 13.2846L4.00263 3.33337L2.24573 8.61779Z"
                      fill="#763E1A"
                    />
                    <path
                      d="M35.0365 19.777L27.7619 17.6495L29.958 20.9712L26.6638 27.3811L31.0149 27.3262H37.4797L35.0365 19.777Z"
                      fill="#F5841F"
                    />
                    <path
                      d="M12.2517 17.6495L4.96332 19.777L2.53386 27.3262H8.99869L13.336 27.3811L10.0419 20.9712L12.2517 17.6495Z"
                      fill="#F5841F"
                    />
                    <path
                      d="M22.1205 21.3276L22.6009 13.2843L24.701 7.56067H15.2988L17.3988 13.2843L17.8792 21.3276L18.0577 23.8531L18.0714 30.0984H21.9283L21.9421 23.8531L22.1205 21.3276Z"
                      fill="#F5841F"
                    />
                  </svg>
                  <div
                    class="c18"
                    color="text"
                    font-size="14px"
                  >
                    Metamask
                  </div>
                </button>
              </div>
              <button
                class="c15 c16"
                scale="md"
                width="100%"
              >
                <svg
                  class="c20"
                  color="textSubtle"
                  viewBox="0 0 24 24"
                  width="40px"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 10C4.9 10 4 10.9 4 12C4 13.1 4.9 14 6 14C7.1 14 8 13.1 8 12C8 10.9 7.1 10 6 10ZM18 10C16.9 10 16 10.9 16 12C16 13.1 16.9 14 18 14C19.1 14 20 13.1 20 12C20 10.9 19.1 10 18 10ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z"
                  />
                </svg>
                <div
                  class="c18"
                  color="text"
                  font-size="14px"
                >
                  More
                </div>
              </button>
            </div>
          </div>
          <div
            class="c21"
          >
            <p
              class="c22"
              color="textSubtle"
              font-size="16px"
            >
              Haven’t got a crypto wallet yet?
            </p>
            <a
              class="c23"
              href="https://docs.coincollect.org/getting-started/create-a-wallet"
              rel="noreferrer noopener"
              scale="md"
              target="_blank"
              width="100%"
            >
              Learn How to Connect
            </a>
          </div>
        </div>
      </div>
    </DocumentFragment>
  `);
});
