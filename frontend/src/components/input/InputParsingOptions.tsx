import * as React from "react";
import { ParseOptions, parseWithOptions } from "../../models/csvImportProfile";
import Modal from "../common/Modal";
import Table from "../common/Table";
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

export default function InputParseOptions(props: InputParseOptionsProps) {
    const [page, setPage] = React.useState(1);
    const [trimWhitespace, setTrimWhitespace] = React.useState(props.value.trimWhitespace);
    const [regexEnabled, setRegexEnabled] = React.useState(props.value.regex !== null);
    const [regexString, setRegexString] = React.useState(props.value.regex?.source ?? "");
    const [regexStringValid, setRegexStringValid] = React.useState(true);
    const [pattern, setPattern] = React.useState(props.value.pattern);

    React.useEffect(() => {
        if (regexStringValid) {
            props.onChange(getParseOptions());
        } else {
            props.onChange("invalid");
        }
    }, [trimWhitespace, regexEnabled, regexString, regexStringValid, pattern]);

    return <div className="columns">
        <div className="column">
            <InputCheckbox label="Trim whitespace"
                onChange={e => setTrimWhitespace(e.target.checked)}
                value={trimWhitespace} />
            
            <InputCheckbox label="Enable RegEx"
                onChange={e => setRegexEnabled(e.target.checked)}
                value={regexEnabled} />
            
            {regexEnabled && <>
                <InputText label="RegEx"
                    value={regexString}
                    errors={regexStringValid ? undefined : ["Invalid regex"]}
                    onChange={e => setRegex(e.target.value)} />
                <InputText label="Pattern"
                    value={pattern}
                    onChange={e => setPattern(e.target.value)} />
            </>}
        </div>
        <div className="column">
            {props.previewData !== null &&
                <Table pageSize={10}
                    page={page}
                    goToPage={setPage}
                    headings={<tr>
                        <th>Raw Value</th>
                        <th>Parsed Value</th>
                    </tr>}
                    items={props.previewData}
                    paginationSize={7}
                    type="sync"
                    renderType="table"
                    renderItem={(item, index) => <tr key={index}>
                        <td>{item}</td>
                        <td>{regexStringValid ? parseWithOptions(item, getParseOptions()) : <span className="has-text-danger">Invalid options</span>}</td>
                    </tr>}
                />}
        </div>
    </div>;

    function getParseOptions(): ParseOptions {
        return {
            pattern,
            regex: regexEnabled && regexStringValid ? new RegExp(regexString) : null,
            trimWhitespace: trimWhitespace,
        };
    }

    function setRegex(newValue: string) {
        let regexValid = true;
        try {
            new RegExp(newValue)
        } catch {
            regexValid = false;
        }

        setRegexString(newValue);
        setRegexStringValid(regexValid);
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
                previewData={this.props.previewData ?? null}
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