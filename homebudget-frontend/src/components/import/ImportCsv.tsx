import * as Papa from "papaparse";
import * as React from "react";
import InputCheckbox from "../form/InputCheckbox";
import InputSelect from "../form/InputSelect";
import InputText from "../form/InputText";

interface Props {
    csvParsed: (data: any[], lines: string[]) => void;
    fileChanged: (file: File) => void;
    optionsChanged: (options: CsvImportOptions) => void;
    options: CsvImportOptions;
    csvFile: File | null;
}

export interface CsvImportOptions {
    csvParseHeader: boolean;
    csvNewlineCharacter: "auto" | "\n" | "\r\n" | "\r";
    csvDelimiter: string;
}

interface State {
    csvData: Papa.ParseResult<unknown> | null | "error";
    rowOffset: number;
    columnOffset: number;
}

const pageSize: number = 20;
const columnPageSize: number = 5;

/*
 * React object class
 */
export default class ImportCsv extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            csvData: null,
            rowOffset: 0,
            columnOffset: 0
        };
    }

    componentDidMount(): void {
        if (this.props.csvFile !== null) {
            this.reparseFile(this.props.csvFile);
        }
    }

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>): void {
        if (this.props.options.csvParseHeader != prevProps.options.csvParseHeader
            || this.props.options.csvNewlineCharacter != prevProps.options.csvNewlineCharacter
            || this.props.options.csvDelimiter != prevProps.options.csvDelimiter) {
            
            if (this.props.csvFile != null) {
                this.reparseFile(this.props.csvFile);
            }
        }
    }

    public render() {
        return <>
            <h3 className="subtitle is-3">Import from CSV file</h3>

            <InputCheckbox label="Parse header"
                value={this.props.options.csvParseHeader}
                onChange={e => this.props.optionsChanged({ ...this.props.options, csvParseHeader: e.target.checked })} />
            <InputCheckbox label="Auto-detect delimiter"
                value={this.props.options.csvDelimiter == "auto"}
                onChange={e => e.target.checked == true
                    ? this.props.optionsChanged({ ...this.props.options, csvDelimiter: "auto" })
                    : this.props.optionsChanged({ ...this.props.options, csvDelimiter: "" })}
            />
            {this.props.options.csvDelimiter != "auto" &&
                <InputText label="Delimiter" value={this.props.options.csvDelimiter} onChange={e => this.props.optionsChanged({ ...this.props.options, csvDelimiter: e.target.value })} />}
            <InputSelect label="Newline character"
                value={this.props.options.csvNewlineCharacter}
                onChange={result => this.props.optionsChanged({ ...this.props.options, csvNewlineCharacter: result as "auto" | "\n" | "\r\n" | "\r" })}
                items={[
                { key: "auto", value: "Detect automatically" },
                { key: "\n", value: "\\n" },
                { key: "\r", value: "\\r" },
                { key: "\r\n", value: "\\r\\n" }
            ]} />
            <div className={"file " + (this.props.csvFile != null ? " has-name" : "")}>
                <label className="file-label">
                    <input className="file-input" type="file" name="resume" onChange={e => this.fileUploaded(e)}/>
                    <span className="file-cta">
                        <span className="file-icon">
                            <i className="fas fa-upload"></i>
                        </span>
                        <span className="file-label">
                            Choose a file…
                        </span>
                    </span>
                    {this.props.csvFile != null && <span className="file-name">
                        {this.props.csvFile.name}
                    </span>}
                </label>
            </div>

            {this.props.csvFile != null && <>
                <h3 className="title is-4">CSV data</h3>
                {this.renderCsvTable()}
            </>}
        </>;
    }

    private renderCsvTable()
    {
        if (this.state.csvData == null) {
            return <p>Loading…</p>;
        }
        if (this.state.csvData == "error") {
            return <p>CSV file could not be parsed</p>;
        }
        if (this.state.csvData.data.length == 0) {
            return <p>No lines could be parsed</p>;
        }

        const columns = Object.keys(this.state.csvData.data[0])
            .map((column, i) => { return { columnName: column, index: i } })
            .slice(this.state.columnOffset * columnPageSize, (this.state.columnOffset + 1) * columnPageSize);
        const rows = this.state.csvData.data.slice(this.state.rowOffset * pageSize, (this.state.rowOffset + 1) * pageSize);
        return <table className="table is-fullwidth is-hoverable">
            <thead>
                <tr>
                    {columns.map((column, i) => <th key={i}>{column.columnName}</th>)}
                </tr>
            </thead>
            <tfoot>
                <tr>
                    {columns.map((column, i) => <th key={i}>{column.columnName}</th>)}
                </tr>
            </tfoot>
            <tbody>
                {rows.map((row, i) => 
                    <tr key={i}>
                        {columns.map(column => 
                            <td key={column.index}>{(row as any)[column.columnName]}</td>
                        )}
                    </tr>
                )}
            </tbody>
        </table>;
    }

    private fileUploaded(e: React.ChangeEvent<HTMLInputElement>)
    {
        let file = e.target.files[0];
        this.setState({
            rowOffset: 0,
            columnOffset: 0,
        });
        this.props.fileChanged(e.target.files[0]);

        this.reparseFile(file);
    }

    private reparseFile(file: File)
    {
        this.setState({
            csvData: null,
        });
        this.props.fileChanged(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            Papa.parse(event.target.result.toString(), {
                header: this.props.options.csvParseHeader,
                delimiter: this.props.options.csvDelimiter == "auto" ? undefined : this.props.options.csvDelimiter,
                newline: this.props.options.csvNewlineCharacter == "auto" ? undefined : this.props.options.csvNewlineCharacter,
                download: false,
                complete: (a) => {
                    this.props.csvParsed(a.data, event.target.result.toString().split(a.meta.linebreak));
                    this.setState({ csvData: a });
                }
            });
        };
        reader.onerror = (event) => {
            console.log(event);
            this.setState({ csvData: "error" });
        }
        reader.readAsText(file);
    }
}
