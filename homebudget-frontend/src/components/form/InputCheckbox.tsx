import * as React from "react";

interface Props {
    label: string;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    value: boolean;
}

export default class InputCheckbox extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return <div className="field">
            <div className="control">
                <label className="checkbox">
                    <input type="checkbox" onChange={e => this.props.onChange(e)} checked={this.props.value}/> {this.props.label}
                </label>
            </div>
        </div>
    }
}