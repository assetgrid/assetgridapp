import * as React from "react";

interface Props {
    onClick?: React.MouseEventHandler<HTMLButtonElement>
    className?: string
    disabled?: boolean
    children: React.ReactNode
}

export default function InputButton (props: Props): React.ReactElement {
    return <button className={`button ${props.className ?? ""}`}
        disabled={props.disabled}
        onClick={props.onClick}>
        {props.children}
    </button>;
}
