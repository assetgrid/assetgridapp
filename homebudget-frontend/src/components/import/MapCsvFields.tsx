import * as Papa from "papaparse";
import * as React from "react";
import { runInThisContext } from "vm";
import InputButton from "../form/InputButton";
import InputCheckbox from "../form/InputCheckbox";
import InputSelect from "../form/InputSelect";
import InputText from "../form/InputText";

type DuplicateHandlingOptions = "none" | "identifier" | "rownumber" | "identifier-rownumber" | "row"

interface Props {
    data: any[];
    lines: string[];
}

interface State {
    rowOffset: number;
    columnOffset: number;

    // Mapping options
    mapDuplicateHandling: DuplicateHandlingOptions;
    mapIdentifierColumn: string | null;
}

const pageSize: number = 20;
const columnPageSize: number = 5;

/*
 * React object class
 */
export default class MapCsvFields extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            rowOffset: 0,
            columnOffset: 0,

            mapDuplicateHandling: "row",
            mapIdentifierColumn: null,
        };
    }

    public render() {
        return <>
            <h3 className="title is-5">Map CSV columns</h3>
            <InputSelect label="Duplicate handling"
                value={this.state.mapDuplicateHandling}
                onChange={result => this.setState({ mapDuplicateHandling: result as DuplicateHandlingOptions })}
                items={[
                    { key: "row", value: "CSV line" },
                    { key: "identifier", value: "Colum" },
                    { key: "identifier-rownumber", value: "Column and count" },
                    { key: "rownumber", value: "Row number" },
                    { key: "none", value: "Allow duplicates" }
                ]} />
            <div className="content">
                <p>Duplicates are handled by calculating an identifier for each transaction and storing this.
                    This value will be compared during import and transactions with the same identifier will be ignored</p>
                <ul>
                    <li><b>CSV line:</b> The line in the current CSV file will be used as a unique identifier.
                        Later CSV-uploads of the exact same line (same columns, same order, same value) will be treated as a duplicate.</li>
                    <li><b>Column:</b> Use a column as a unique identifier.</li>
                    <li><b>Column and count:</b> Use a column as a unique identifier, but append a number for each occurence of the same column value in the CSV-file.
                        Useful with dates. If you have 3 transactions with value 2020-01-01, their identifier will be 2020-01-01.1, 2020-01-01.2, 2020-01-01.3
                        based on the order they appear in the file</li>
                    <li><b>Row number:</b> The row number is the unique identifier.</li>
                    <li><b>Allow duplicates:</b> No duplicate checking will occur.</li>
                </ul>
            </div>

            {["identifier", "identifier-rownumber"].indexOf(this.state.mapDuplicateHandling) > -1 &&
                <InputSelect label="Identifier column"
                    value={this.state.mapIdentifierColumn}
                    placeholder={"Select column"}
                    onChange={result => this.setState({ mapIdentifierColumn: result })}
                    items={Object.keys(this.props.data[0]).map(item => {
                        return {
                            key: item,
                            value: item,
                        }
                    })} />
            }

            {this.renderImportTable()}
        </>;
    }

    private renderImportTable()
    {
        const rows = this.props.data
            .map((row, i) => {
                return {
                    row: row,
                    rowNumber: i,
                }
            })
            .slice(this.state.rowOffset * pageSize, (this.state.rowOffset + 1) * pageSize);
        return <table className="table is-fullwidth is-hoverable">
            <thead>
                <tr>
                    <th>Identifier</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tfoot>
                <tr>
                    <th>Identifier</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Amount</th>
                </tr>
            </tfoot>
            <tbody>
                {rows.map((row, i) => 
                    <tr key={i}>
                        <td>{this.getIdentifier(row.rowNumber, row.row)}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                )}
            </tbody>
        </table>;
    }

    private getIdentifier(rowNumber: number, row: string[] | { [key: string]: string }): string
    {
        switch (this.state.mapDuplicateHandling)
        {
            case "none":
                return "";
            case "rownumber":
                return rowNumber.toString();
            case "identifier":
                if (this.state.mapIdentifierColumn == null) {
                    return "";
                } else {
                    return (row as any)[this.state.mapIdentifierColumn];
                }
            case "identifier-rownumber":
                if (this.state.mapIdentifierColumn == null) {
                    return "";
                } else {
                    const value = (row as any)[this.state.mapIdentifierColumn]
                    let number = this.props.data
                        .map((row, index) => [row, index])
                        .filter(row => row[1] <= rowNumber && row[0][this.state.mapIdentifierColumn] == value)
                        .length;
                    return value + "." + number;
                }
            case "row":
                return this.props.lines[rowNumber];
        }
    }
}
