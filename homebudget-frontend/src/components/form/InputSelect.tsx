import * as React from "react";

interface Props {
    label: string;
    items: { key: string, value: string }[];
    value: string,
    placeholder?: string,
    onChange: (selectedKey: string) => void;
}

export default class InputSelect extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return <div className="field">
            {this.props.label && <label className="label">{this.props.label}</label>}
            <div className="field has-addons">
                <div className="control is-expanded">
                    <div className="select">
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
            </div>
        </div>;
    }
}