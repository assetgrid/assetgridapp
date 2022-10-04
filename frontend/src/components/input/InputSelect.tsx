import * as React from "react";

interface Props<T> {
    label?: string;
    items: { key: T, value: string }[];
    value: T | null,
    placeholder?: string,
    onChange: (selectedKey: T) => void;
    addOnAfter?: React.ReactElement;
    isFullwidth?: boolean;
    disabled?: boolean;
}

export default class InputSelect<T extends string> extends React.Component<Props<T>> {
    constructor(props: Props<T>) {
        super(props);
    }

    public render() {
        return <div className="field">
            {this.props.label && <label className="label">{this.props.label}</label>}
            <div className="field has-addons">
                <div className="control is-expanded">
                    <div className={"select" + (this.props.isFullwidth ? " is-fullwidth" : "")}>
                        <select value={this.props.value ?? "___placeholder___"}
                            disabled={this.props.disabled}
                            onChange={e => this.props.onChange(e.target.value as T)}>
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