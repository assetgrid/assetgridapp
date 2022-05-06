import * as React from "react";
import CreateTransaction from "./CreateTransaction";

export default class PageCreateTransaction extends React.Component<{}> {
    constructor(props: {}) {
        super(props);
    }

    public render() {
        return <section className="section container">
            <div className="box">
                <CreateTransaction />
            </div>
        </section>;
    }
}
