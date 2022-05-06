import * as Papa from "papaparse";
import * as React from "react";
import InputCheckbox from "../form/InputCheckbox";
import InputSelect from "../form/InputSelect";
import InputText from "../form/InputText";

interface Props {
    onChange: (data: any[], lines: string[]) => void;
}

interface State {
    csvFile: File | null;
    csvData: Papa.ParseResult<unknown> | null | "error";
    rowOffset: number;
    columnOffset: number;

    // CSV options
    csvParseHeader: boolean,
    csvNewlineCharacter: "auto" | "\n" | "\r\n" | "\r",
    csvDelimiter: string,
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
            csvFile: null,
            csvData: null,
            rowOffset: 0,
            columnOffset: 0,

            csvParseHeader: false,
            csvDelimiter: "auto",
            csvNewlineCharacter: "auto",
        };
    }

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>): void {
        if (this.state.csvParseHeader != prevState.csvParseHeader
            || this.state.csvNewlineCharacter != prevState.csvNewlineCharacter
            || this.state.csvDelimiter != prevState.csvDelimiter) {
            
            if (this.state.csvFile != null) {
                this.reparseFile(this.state.csvFile);
            }
        }
    }

    public render() {
        return <>
            <h3 className="subtitle is-3">Import from CSV file</h3>

            <InputCheckbox label="Parse header"
                value={this.state.csvParseHeader}
                onChange={e => this.setState({ csvParseHeader: e.target.checked })} />
            <InputCheckbox label="Auto-detect delimiter"
                value={this.state.csvDelimiter == "auto"}
                onChange={e => e.target.checked == true
                    ? this.setState({ csvDelimiter: "auto" })
                    : this.setState({ csvDelimiter: "" })}
            />
            {this.state.csvDelimiter != "auto" &&
                <InputText label="Delimiter" value={this.state.csvDelimiter} onChange={e => this.setState({ csvDelimiter: e.target.value })} />}
            <InputSelect label="Newline character"
                value={this.state.csvNewlineCharacter}
                onChange={result => this.setState({ csvNewlineCharacter: result as "auto" | "\n" | "\r\n" | "\r" })}
                items={[
                { key: "auto", value: "Detect automatically" },
                { key: "\n", value: "\\n" },
                { key: "\r", value: "\\r" },
                { key: "\r\n", value: "\\r\\n" }
            ]} />
            <div className={"file " + (this.state.csvFile != null ? " has-name" : "")}>
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
                    {this.state.csvFile != null && <span className="file-name">
                        {this.state.csvFile.name}
                    </span>}
                </label>
            </div>

            {this.state.csvFile != null && <>
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
            csvFile: this.state.csvFile,
            rowOffset: 0,
            columnOffset: 0,
        });

        this.reparseFile(file);
    }

    private reparseFile(file: File)
    {
        this.setState({
            csvFile: file,
            csvData: null,
        });

        const reader = new FileReader();
        reader.onload = (event) => {
            Papa.parse(event.target.result.toString(), {
                header: this.state.csvParseHeader,
                delimiter: this.state.csvDelimiter == "auto" ? undefined : this.state.csvDelimiter,
                newline: this.state.csvNewlineCharacter == "auto" ? undefined : this.state.csvNewlineCharacter,
                download: false,
                complete: (a) => {
                    console.log(a);
                    this.props.onChange(a.data, event.target.result.toString().split(a.meta.linebreak));
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
