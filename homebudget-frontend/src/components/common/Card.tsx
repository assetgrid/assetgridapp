import * as React from "react";

interface Props {
    title: string;
    margin?: number;
    style?: React.CSSProperties;
}

export class Card extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return <div className={"card m-3"} style={this.props.style}>
            <header className="card-header">
                <p className="card-header-title">
                    {this.props.title}
                </p>
            </header>
            <div className="card-content">
                {this.props.children}
            </div>
        </div>;
    }
}