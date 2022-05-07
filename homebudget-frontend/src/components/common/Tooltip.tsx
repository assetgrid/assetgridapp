import * as React from "react";

export interface Props {
    content: React.ReactNode;
}

export default class Tooltip extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return <div className="tooltip-container">
            {this.props.children}
            <div className="tooltip box">
                {this.props.content}
            </div>
        </div>;
    }
}