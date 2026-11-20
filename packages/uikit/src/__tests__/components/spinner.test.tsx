import React from "react";
import { renderWithTheme } from "../../testHelpers";
import { Spinner } from "../../components/Spinner";

it("renders correctly", () => {
  const { asFragment } = renderWithTheme(<Spinner />);
  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      .c1 {
      display: inline-block;
      width: 256px;
      height: 256px;
    }

    .c1 video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .c0 {
      position: relative;
    }

    <div
        class="c0"
      >
        <div
          class="c1"
          width="256px"
        >
          <video
            autoplay=""
            loop=""
            playsinline=""
            src="/loader.webm"
          />
        </div>
      </div>
    </DocumentFragment>
  `);
});
