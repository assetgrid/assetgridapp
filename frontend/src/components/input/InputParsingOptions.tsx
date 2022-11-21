import { t } from "i18next";
import * as React from "react";
import { ParseOptions, parseWithOptions } from "../../models/csvImportProfile";
import Modal from "../common/Modal";
import Table from "../common/Table";
import InputCheckbox from "./InputCheckbox";
import InputText from "./InputText";

interface InputParseOptionsProps {
    value: ParseOptions
    disabled?: boolean
    onChange: (value: ParseOptions | "invalid") => void
    previewData: string[] | null
}

export default function InputParseOptions (props: InputParseOptionsProps): React.ReactElement {
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
            <InputCheckbox label={t("common.trim_whitespace")!}
                onChange={e => setTrimWhitespace(e.target.checked)}
                value={trimWhitespace} />

            <InputCheckbox label={t("regex.enable_regex")!}
                onChange={e => setRegexEnabled(e.target.checked)}
                value={regexEnabled} />

            {regexEnabled && <>
                <InputText label={t("regex.regex")!}
                    value={regexString}
                    errors={regexStringValid ? undefined : [t("regex.invalid_regex")]}
                    onChange={e => setRegex(e.target.value)} />
                <InputText label={t("regex.pattern")!}
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
                        <th>{t("parse.raw_value")}</th>
                        <th>{t("parse.parsed_value")}</th>
                    </tr>}
                    items={props.previewData}
                    paginationSize={7}
                    renderItem={(item, index) => <tr key={index}>
                        <td>{item}</td>
                        <td>
                            {regexStringValid
                                ? parseWithOptions(item, getParseOptions())
                                : <span className="has-text-danger">{t("parse.invalid_options")}</span>}
                        </td>
                    </tr>}
                />}
        </div>
    </div>;

    function getParseOptions (): ParseOptions {
        return {
            pattern,
            regex: regexEnabled && regexStringValid ? new RegExp(regexString) : null,
            trimWhitespace
        };
    }

    function setRegex (newValue: string): void {
        let regexValid = true;
        try {
            new RegExp(newValue); // eslint-disable-line no-new
        } catch {
            regexValid = false;
        }

        setRegexString(newValue);
        setRegexStringValid(regexValid);
    }
}

interface InputParseOptionsModalProps {
    close: () => void
    closeOnChange?: boolean
    onChange: (options: ParseOptions) => void
    value: ParseOptions
    previewData?: string[]
}

interface InputParseOptionsModalState {
    valid: boolean
    value: ParseOptions
}

export class InputParseOptionsModal extends React.Component<InputParseOptionsModalProps, InputParseOptionsModalState> {
    constructor (props: InputParseOptionsModalProps) {
        super(props);
        this.state = {
            valid: true,
            value: this.props.value
        };
    }

    public render (): React.ReactElement {
        return <Modal
            active={true}
            title={"Parse options"}
            close={() => this.props.close()}
            footer={<>
                <button className="button is-success" onClick={() => this.saveChanges()} disabled={!this.state.valid}>{t("common.apply_changes")}</button>
                <button className="button" onClick={() => this.props.close()}>{t("common.cancel")}</button>
            </>}>
            <InputParseOptions
                value={this.props.value}
                previewData={this.props.previewData ?? null}
                onChange={options => this.onChange(options)}
            />
        </Modal>;
    }

    private onChange (newOptions: ParseOptions | "invalid"): void {
        if (newOptions === "invalid") {
            this.setState({ valid: false });
        } else {
            this.setState({ valid: true, value: newOptions });
        }
    }

    private saveChanges (): void {
        this.props.onChange(this.state.value);
        if (this.props.closeOnChange === true) {
            this.props.close();
        }
    }
}
