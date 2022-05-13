import * as React from "react";

export interface Props {
    active: boolean;
    close?: () => void;
    footer?: React.ReactNode;
    title: string;
}

export default class Modal extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return <div className="modal is-active">
        <div className="modal-background"></div>
            <div className="modal-card">
                <header className="modal-card-head">
                    <p className="modal-card-title">{this.props.title}</p>
                    {this.props.close !== undefined && <button className="delete" aria-label="close" onClick={() => this.props.close()}></button>}
                </header>
                <section className="modal-card-body">
                    {this.props.children}
                </section>
                {this.props.footer !== undefined && <footer className="modal-card-foot">
                    {this.props.footer}
                </footer>}
            </div>
        </div>
    }
}