import * as React from "react";
import DropdownContent from "./DropdownContent";

export interface Props {
    content: React.ReactNode
    children: React.ReactNode
}

export default function Tooltip (props: Props): React.ReactElement {
    const [isOpen, setIsOpen] = React.useState(false);
    return <div className="tooltip-container" onMouseOver={mouseOver} onMouseLeave={mouseOut}>
        {props.children}
        <DropdownContent active={isOpen} preferedPosition="center" fullWidth={false} pointerEvents={false}>
            <div className="tooltip box is-size-7 has-text-left">
                {props.content}
            </div>
        </DropdownContent>
    </div>;

    function mouseOver (e: React.MouseEvent): void {
        setIsOpen(true);
    }

    function mouseOut (): void {
        setIsOpen(false);
    }
}
