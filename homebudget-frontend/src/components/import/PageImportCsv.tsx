import * as Papa from "papaparse";
import * as React from "react";

interface State
{
    csvFile: File | null;
    csvData: any[] | null | "error";
    rowOffset: number;
    columnOffset: number;
}

const pageSize: number = 20;
const columnPageSize: number = 5;

/*
 * React object class
 */
export default class PageImportCsv extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = {
            csvFile: null,
            csvData: null,
            rowOffset: 0,
            columnOffset: 0,
        };
    }

    public render() {
        return <section className="section container">
            <div className="box">
                <h2 className="title is-2">Import transactions</h2>
                <h3 className="subtitle is-3">Import from CSV file</h3>

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

            </div>
        </section>;
    }

    private renderCsvTable()
    {
        if (this.state.csvData == null) {
            return <p>Loading…</p>;
        }
        if (this.state.csvData == "error") {
            return <p>CSV file could not be parsed</p>;
        }

        const columns = Object.keys(this.state.csvData[0])
            .map((column, i) => { return { columnName: column, index: i } })
            .slice(this.state.columnOffset * columnPageSize, this.state.columnOffset * columnPageSize + columnPageSize);
        return <table className="table is-fullwidth is-hoverable">
            <thead>
                <tr>
                    {columns.map((text, i) => <th key={i}>{text}</th>)}
                </tr>
            </thead>
            <tfoot>
                <tr>
                    {columns.map((text, i) => <th key={i}>{text}</th>)}
                </tr>
            </tfoot>
            <tbody>
                {this.state.csvData.map((row, i) => 
                    <tr key={i}>
                        {columns.map(column => 
                            <td key={column.index}>{row[column.columnName]}</td>
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
            csvFile: file,
            csvData: null,
            rowOffset: 0,
            columnOffset: 0,
        });

        Papa.parse(file, {
            header: true,
            complete: (a) => {
                console.log(a);
                this.setState({ csvData: a.data });
            },
            error: (a) => {
                console.log(a);
                this.setState({ csvData: "error" });
            }
        });
    }
}
