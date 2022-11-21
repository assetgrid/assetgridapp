import * as React from "react";
import { createPortal } from "react-dom";

export interface Props {
    active: boolean
    close?: () => void
    footer?: React.ReactNode
    title: string
    children: React.ReactNode
}

export default function Modal (props: Props): React.ReactElement {
    return createPortal(<div className={"modal" + (props.active ? " is-active" : "")}>
        <div className="modal-background"></div>
        <div className="modal-card">
            <header className="modal-card-head">
                <p className="modal-card-title">{props.title}</p>
                {props.close !== undefined && <button className="delete" aria-label="close" onClick={() => props.close!()}></button>}
            </header>
            <section className="modal-card-body">
                {props.children}
            </section>
            {props.footer !== undefined && <footer className="modal-card-foot">
                {props.footer}
            </footer>}
        </div>
    </div>, document.body);
}
