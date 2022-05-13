import * as React from "react";
import Modal from "../common/Modal";
import Table from "../common/Table";
import { parseWithOptions, ParseOptions } from "../import/ParseOptions";
import InputButton from "./InputButton";
import InputCheckbox from "./InputCheckbox";
import InputText from "./InputText";

interface InputParseOptionsProps {
    value: ParseOptions;
    disabled?: boolean;
    onChange: (value: ParseOptions | "invalid") => void;
    previewData: string[] | null;
}

interface InputParseOptionsState {
    trimWhitespace: boolean,
    regexEnabled: boolean,
    regexString: string,
    regexStringValid: boolean,
    pattern: string,
}

export class InputParseOptions extends React.Component<InputParseOptionsProps, InputParseOptionsState> {
    constructor(props: InputParseOptionsProps) {
        super(props);
        this.state = {
            trimWhitespace: props.value.trimWhitespace,
            regexEnabled: props.value.regex !== null,
            regexString: props.value.regex?.source ?? "",
            regexStringValid: true,
            pattern: props.value.pattern,
        }
    }

    public render() {
        return <div className="columns">
            <div className="column">
                <InputCheckbox label="Trim whitespace"
                    onChange={e => this.changed({ trimWhitespace: e.target.checked })}
                    value={this.state.trimWhitespace} />
                
                <InputCheckbox label="Enable RegEx"
                    onChange={e => this.changed({ regexEnabled: e.target.checked })}
                    value={this.state.regexEnabled} />
                
                {this.state.regexEnabled && <>
                    <InputText label="RegEx"
                        value={this.state.regexString}
                        error={this.state.regexStringValid ? null : "Invalid regex"}
                        onChange={e => this.regexTextChanged(e.target.value)} />
                    <InputText label="Pattern"
                        value={this.state.pattern}
                        onChange={e => this.changed({ pattern: e.target.value })} />
                </>}
            </div>
            <div className="column">
                {this.props.previewData !== null &&
                    <Table pageSize={10}
                        headings={<tr>
                            <th>Raw Value</th>
                            <th>Parsed Value</th>
                        </tr>}
                        items={this.props.previewData}
                        renderItem={(item, index) => <tr key={index}>
                            <td>{item}</td>
                            <td>{this.isValid() ? parseWithOptions(item, this.getParseOptions()) : <span className="has-text-danger">Invalid options</span>}</td>
                        </tr>}
                />}
            </div>
        </div>;
    }

    private changed(newState: Partial<InputParseOptionsState>) {
        this.setState(newState as any, () => {
            if (this.isValid()) {
                this.props.onChange(this.getParseOptions());
            } else {
                this.props.onChange("invalid");
            }
        });
    }

    private regexTextChanged(newValue: string): void {
        let regexValid = true;
        try {
            new RegExp(newValue)
        } catch {
            regexValid = false;
        }

        this.changed({
            regexString: newValue,
            regexStringValid: regexValid
        });
    }

    private isValid(): boolean {
        return this.state.regexStringValid;
    }

    private getParseOptions(): ParseOptions {
        return {
            pattern: this.state.pattern,
            regex: this.state.regexEnabled && this.state.regexStringValid ? new RegExp(this.state.regexString) : null,
            trimWhitespace: this.state.trimWhitespace,
        };
    }
}

interface InputParseOptionsModalProps {
    close: () => void;
    closeOnChange?: boolean;
    onChange: (options: ParseOptions) => void;
    value: ParseOptions;
    previewData?: string[];
}

interface InputParseOptionsModalState {
    valid: boolean;
    value: ParseOptions;
}

export class InputParseOptionsModal extends React.Component<InputParseOptionsModalProps, InputParseOptionsModalState> {
    constructor(props: InputParseOptionsModalProps) {
        super(props);
        this.state = {
            valid: true,
            value: this.props.value,
        }
    }

    public render() {
        return <Modal
            active={true}
            title={"Parse options"}
            close={() => this.props.close()}
            footer={<>
                <button className="button is-success" onClick={() => this.saveChanges()} disabled={! this.state.valid}>Apply Changes</button>
                <button className="button" onClick={() => this.props.close()}>Cancel</button>
            </>}>
            <InputParseOptions
                value={this.props.value}
                previewData={this.props.previewData}
                onChange={options => this.onChange(options)}
            />
        </Modal>;
    }

    private onChange(newOptions: ParseOptions | "invalid") {
        if (newOptions === "invalid") {
            this.setState({ valid: false });
        } else {
            this.setState({ valid: true, value: newOptions });
        }
    }

    private saveChanges(): void {
        this.props.onChange(this.state.value);
        if (this.props.closeOnChange === true) {
            this.props.close();
        }
    }
}