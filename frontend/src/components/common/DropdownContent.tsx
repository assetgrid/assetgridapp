import * as React from "react";
import { createPortal } from "react-dom";
import { modalContainerContext } from "../App";

interface Props {
    children: React.ReactNode;
    active: boolean;
    fullWidth: boolean;
}

export default function DropdownContent(props: Props) {
    const { container } = React.useContext(modalContainerContext);
    const ref = React.useRef<HTMLSpanElement>(null);
    const timeoutRef = React.useRef<NodeJS.Timer | null>(null);
    const parentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        timeoutRef.current = setInterval(() => updateContent(), 100);
        return () => clearInterval(timeoutRef.current!);
    }, []);
    
    if (!container) { return null; }

    return <>
        <span ref={ref}></span>
        {createPortal(<div ref={parentRef} style={{
                position: "fixed",
                transition: "top 0.1s, bottom 0.1s"
            }}
            className={props.active ? "dropdown is-active" : ""}>
            {props.children}
        </div>, container)}
    </>;

    function updateContent() {
        if (ref.current !== null && parentRef.current !== null) {
            const parentBounding = ref.current.parentElement!.getBoundingClientRect();
            const dropdownBounding = parentRef.current.children[0].getBoundingClientRect();

            if (dropdownBounding.width === 0) {
                parentRef.current.style.opacity = "0";
            } else {
                parentRef.current.style.opacity = "1";
            }

            if (parentBounding.right < dropdownBounding.width - 10) {
                parentRef.current.style.left = (parentBounding.left).toString() + "px";
                parentRef.current.style.right = "";
            } else {
                parentRef.current.style.left = "";
                parentRef.current.style.right = (window.innerWidth - parentBounding.right + dropdownBounding.width).toString() + "px";
            }

            if (props.fullWidth) {
                (parentRef.current.children[0] as HTMLElement).style.width = Math.max(300, parentBounding.width) + "px";
            } else {
                (parentRef.current.children[0] as HTMLElement).style.width = "";
            }

            if (parentBounding.bottom > window.innerHeight - dropdownBounding.height - 10) {
                parentRef.current.style.top = (parentBounding.top - dropdownBounding.height - 15).toString() + "px";
            } else {
                parentRef.current.style.top = (parentBounding.bottom + 15).toString() + "px";
            }
        }
    }
}