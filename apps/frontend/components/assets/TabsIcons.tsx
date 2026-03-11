import Svg, { ClipPath, Defs, G, Path, Rect, SvgProps } from "react-native-svg"

export const TabHomeIcon = ({ stroke = "#000", ...props }: SvgProps) => (
    <Svg
        width={38}
        height={38}
        fill="none"
        viewBox="0 0 37 37"
        {...props}
    >
        <Rect
            width={35}
            height={35}
            x={1}
            y={1}
            stroke={stroke}
            strokeWidth={2}
            rx={17.5}
        />
        <Path
            fill={stroke}
            d="M12.5 25h3v-6h6v6h3v-9l-6-4.5-6 4.5v9Zm-2 2V15l8-6 8 6v12h-7v-6h-2v6h-7Z"
        />
    </Svg>
)

export const TabNewTripIcon = ({ stroke = "#000", ...props }: SvgProps) => (
    <Svg
        width={38}
        height={38}
        fill="none"
        viewBox="0 0 37 37"
        {...props}
    >
        <Rect
            width={35}
            height={35}
            x={1}
            y={1}
            stroke={stroke}
            strokeWidth={2}
            rx={17.5}
        />
        <Path fill={stroke} d="M17.5 19h-6v-2h6v-6h2v6h6v2h-6v6h-2v-6Z" />
    </Svg>
)

export const TabProfileIcon = ({ stroke = "#000", ...props }: SvgProps) => (
    <Svg
        width={38}
        height={38}
        fill="none"
        viewBox="0 0 37 37"
        {...props}
    >
        <Rect
            width={35}
            height={35}
            x={1}
            y={1}
            stroke={stroke}
            strokeWidth={2}
            rx={17.5}
        />
        <Path
            fill={stroke}
            d="M18.5 18c-1.1 0-2.042-.392-2.825-1.175C14.892 16.042 14.5 15.1 14.5 14s.392-2.042 1.175-2.825C16.458 10.392 17.4 10 18.5 10s2.042.392 2.825 1.175C22.108 11.958 22.5 12.9 22.5 14s-.392 2.042-1.175 2.825C20.542 17.608 19.6 18 18.5 18Zm-8 8v-2.8c0-.567.146-1.087.438-1.563.291-.474.679-.837 1.162-1.087a14.841 14.841 0 0 1 3.15-1.163A13.76 13.76 0 0 1 18.5 19c1.1 0 2.183.13 3.25.387 1.067.259 2.117.646 3.15 1.163.483.25.87.613 1.163 1.087.291.476.437.996.437 1.563V26h-16Zm2-2h12v-.8a.973.973 0 0 0-.5-.85c-.9-.45-1.808-.787-2.725-1.012a11.6 11.6 0 0 0-5.55 0c-.917.224-1.825.562-2.725 1.012a.973.973 0 0 0-.5.85v.8Zm6-8c.55 0 1.02-.196 1.413-.588.391-.391.587-.862.587-1.412 0-.55-.196-1.02-.587-1.412A1.926 1.926 0 0 0 18.5 12c-.55 0-1.02.196-1.413.588A1.926 1.926 0 0 0 16.5 14c0 .55.196 1.02.587 1.412.392.392.863.588 1.413.588Z"
        />
    </Svg>
)

export const TabFeedIcon = ({ stroke = "#000", ...props }: SvgProps) => (
    <Svg
        width={38}
        height={38}
        fill="none"
        viewBox="0 0 37 37"
        {...props}
    >
        <Rect
            width={35}
            height={35}
            x={1}
            y={1}
            stroke={stroke}
            strokeWidth={2}
            rx={17.5}
        />
        <G clipPath="url(#a)">
            <Path
                fill={stroke}
                d="m26.1 27.5-6.3-6.3a6.096 6.096 0 0 1-3.8 1.3c-1.817 0-3.354-.63-4.613-1.887C10.13 19.354 9.5 17.817 9.5 16c0-1.817.63-3.354 1.887-4.613C12.646 10.13 14.183 9.5 16 9.5c1.817 0 3.354.63 4.613 1.887C21.87 12.646 22.5 14.183 22.5 16a6.096 6.096 0 0 1-1.3 3.8l6.3 6.3-1.4 1.4Zm-10.1-7c1.25 0 2.313-.438 3.188-1.313S20.5 17.25 20.5 16c0-1.25-.438-2.313-1.313-3.188C18.313 11.938 17.25 11.5 16 11.5c-1.25 0-2.313.438-3.188 1.313-.874.874-1.312 1.937-1.312 3.187 0 1.25.438 2.313 1.313 3.188.874.875 1.937 1.312 3.187 1.312Z"
            />
        </G>
        <Defs>
            <ClipPath id="a">
                <Path fill="#fff" d="M6.5 6h24v24h-24z" />
            </ClipPath>
        </Defs>
    </Svg>
)