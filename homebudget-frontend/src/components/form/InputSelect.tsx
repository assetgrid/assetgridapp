import * as React from "react";

interface Props {
    label?: string;
    items: { key: string, value: string }[];
    value: string,
    placeholder?: string,
    onChange: (selectedKey: string) => void;
    addOnAfter?: React.ReactElement;
    isFullwidth?: boolean;
}

export default class InputSelect<T> extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return <div className="field">
            {this.props.label && <label className="label">{this.props.label}</label>}
            <div className="field has-addons">
                <div className="control is-expanded">
                    <div className={"select" + (this.props.isFullwidth ? " is-fullwidth" : "")}>
                        <select value={this.props.value ?? "___placeholder___"}
                            onChange={e => this.props.onChange(e.target.value)}>
                            {this.props.placeholder !== undefined && <option disabled value="___placeholder___">{this.props.placeholder}</option>}
                            {this.props.items.map(item => <option key={item.key}
                                value={item.key}>
                                {item.value}
                            </option>)}
                        </select>
                    </div>
                </div>
                {this.props.addOnAfter && this.props.addOnAfter}
            </div>
        </div>;
    }
}