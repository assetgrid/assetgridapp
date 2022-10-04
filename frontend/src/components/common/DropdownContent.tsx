import * as React from "react";
import { createPortal } from "react-dom";
import { modalContainerContext } from "../App";

interface Props {
    children: React.ReactNode;
    active: boolean;
}

type positionType = [number | undefined, number | undefined, number | undefined, number | undefined];

export default function DropdownContent(props: Props) {
    const { container } = React.useContext(modalContainerContext);
    const ref = React.useRef<HTMLSpanElement>(null);
    const timeoutRef = React.useRef<NodeJS.Timer | null>(null);
    const parentRef = React.useRef<HTMLDivElement>(null);

    if (!container) { return null; }

    React.useEffect(() => {
        timeoutRef.current = setInterval(() => updateContent(), 100);
        return () => clearInterval(timeoutRef.current!);
    }, []);

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
            const viewportOffset = ref.current.parentElement!.getBoundingClientRect();
            const dropdownBounding = parentRef.current.children[0].getBoundingClientRect();

            if (dropdownBounding.width === 0) {
                parentRef.current.style.opacity = "0";
            } else {
                parentRef.current.style.opacity = "1";
            }

            if (viewportOffset.right < dropdownBounding.width - 10) {
                parentRef.current.style.left = (viewportOffset.left).toString() + "px";
                parentRef.current.style.right = "";
            } else {
                parentRef.current.style.left = "";
                parentRef.current.style.right = (window.innerWidth - viewportOffset.right + dropdownBounding.width).toString() + "px";
            }

            if (viewportOffset.bottom > window.innerHeight - dropdownBounding.height - 10) {
                parentRef.current.style.top = (viewportOffset.top - dropdownBounding.height - 5).toString() + "px";
            } else {
                parentRef.current.style.top = (viewportOffset.bottom + 5).toString() + "px";
            }
        }
    }
}