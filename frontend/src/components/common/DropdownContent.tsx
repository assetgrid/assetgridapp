import * as React from "react";
import { createPortal } from "react-dom";

interface Props {
    children: React.ReactNode
    active: boolean
    fullWidth: boolean
    preferedPosition?: "center" | "left" | "right"
    pointerEvents?: boolean
}

export default function DropdownContent (props: Props): React.ReactElement {
    const ref = React.useRef<HTMLSpanElement>(null);
    const timeoutRef = React.useRef<NodeJS.Timer | null>(null);
    const parentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        timeoutRef.current = setInterval(() => updateContent(), 100);
        return () => clearInterval(timeoutRef.current!);
    }, []);

    return <>
        <span ref={ref}></span>
        {createPortal(<div ref={parentRef} style={{
            position: "fixed",
            transition: "top 0.1s, bottom 0.1s",
            zIndex: 50
        }}
        className={props.active ? "dropdown is-active" : ""}>
            {props.children}
        </div>, document.body)}
    </>;

    function updateContent (): void {
        if (ref.current !== null && parentRef.current !== null) {
            const parentBounding = ref.current.parentElement!.getBoundingClientRect();
            const dropdownBounding = parentRef.current.children[0].getBoundingClientRect();

            if (props.pointerEvents === false) {
                parentRef.current.style.pointerEvents = "none";
            }

            if (dropdownBounding.width === 0) {
                parentRef.current.style.opacity = "0";
            } else {
                parentRef.current.style.opacity = "1";
            }

            // The number of pixels between the dropdown and the edge of the screen before the dropdown is moved
            const screnMargin = 10;
            const preferedPosition = props.preferedPosition ?? "left";
            const parentcenter = parentBounding.left + (parentBounding.right - parentBounding.left) * 0.5;

            switch (preferedPosition) {
                case "left":
                    if (parentBounding.right - dropdownBounding.width < screnMargin) {
                    // Position to the right
                        parentRef.current.style.left = (parentBounding.left).toString() + "px";
                        parentRef.current.style.right = "";
                    } else {
                    // Position to the left
                        parentRef.current.style.left = "";
                        parentRef.current.style.right = (window.innerWidth - parentBounding.right + dropdownBounding.width).toString() + "px";
                    }
                    break;
                case "right":
                    if (parentBounding.left + dropdownBounding.width > window.innerWidth - screnMargin) {
                    // Position to the left
                        parentRef.current.style.left = "";
                        parentRef.current.style.right = (window.innerWidth - parentBounding.right + dropdownBounding.width).toString() + "px";
                    } else {
                    // Position to the right
                        parentRef.current.style.left = (parentBounding.left).toString() + "px";
                        parentRef.current.style.right = "";
                    }
                    break;
                case "center":
                    // Center position
                    parentRef.current.style.left = (parentcenter - dropdownBounding.width * 0.5).toString() + "px";
                    parentRef.current.style.right = "";

                    // Move so it isn't cut off by the edge of the screen
                    if (parentcenter - dropdownBounding.width * 0.5 < screnMargin) {
                        parentRef.current.style.left = `${screnMargin}px`;
                    } else if (parentcenter + dropdownBounding.width * 0.5 < window.innerWidth - 10) {
                        parentRef.current.style.right = `${screnMargin}px`;
                    }
                    break;
            }

            if (props.fullWidth) {
                (parentRef.current.children[0] as HTMLElement).style.width = `${Math.max(300, parentBounding.width)}px`;
            } else {
                (parentRef.current.children[0] as HTMLElement).style.width = "";
            }

            if (parentBounding.bottom > window.innerHeight - dropdownBounding.height - 10) {
                parentRef.current.style.top = `${(parentBounding.top - dropdownBounding.height - 7).toString()}px`;
            } else {
                parentRef.current.style.top = `${(parentBounding.bottom + 5).toString()}px`;
            }
        }
    }
}
