import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1565c0 0%, #0d3b8c 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "20%",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 280,
            fontWeight: 900,
            lineHeight: 1,
            fontFamily: "serif",
          }}
        >
          ח
        </span>
      </div>
    ),
    { ...size }
  );
}
