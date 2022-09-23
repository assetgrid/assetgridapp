import * as React from "react";

export interface Props {
    content: React.ReactNode;
    children: React.ReactNode;
}

export default class Tooltip extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return <div className="tooltip-container">
            {this.props.children}
            <div className="tooltip box is-size-7">
                {this.props.content}
            </div>
        </div>;
    }
}