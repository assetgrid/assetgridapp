import axios from "axios";
import * as Papa from "papaparse";
import * as React from "react";
import { runInThisContext } from "vm";
import { Account } from "../../models/account";
import InputButton from "../form/InputButton";
import InputCheckbox from "../form/InputCheckbox";
import InputSelect from "../form/InputSelect";
import InputText from "../form/InputText";

type DuplicateHandlingOptions = "none" | "identifier" | "rownumber" | "identifier-rownumber" | "row"
type AccountIdentifier = "id" | "name" | "account-number";

interface Props {
    data: any[];
    lines: string[];
}

interface State {
    rowOffset: number;

    // Mapping options
    mapDuplicateHandling: DuplicateHandlingOptions;
    mapIdentifierColumn: string | null;
    mapSourceAccountColumn: string | null;
    mapSourceAccountIdentifier: AccountIdentifier;
    mapDestinationAccountColumn: string | null;
    mapDestinationAccountIdentifier: AccountIdentifier;

    accountsBy: { [key: string]: { [key: string]: Account | "loading" | "not-found" } };
}

const pageSize: number = 20;

/*
 * React object class
 */
export default class MapCsvFields extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            rowOffset: 0,

            mapDuplicateHandling: "row",
            mapIdentifierColumn: null,
            mapSourceAccountColumn: null,
            mapSourceAccountIdentifier: "name",
            mapDestinationAccountColumn: null,
            mapDestinationAccountIdentifier: "name",

            accountsBy: {},
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

            <div className="columns">
                <div className="column is-half">
                    <InputSelect label="Source account identifier"
                        value={this.state.mapSourceAccountIdentifier}
                        placeholder={"Select variable"}
                        onChange={result => this.setState({ mapSourceAccountIdentifier: result as AccountIdentifier })}
                        items={[
                            { key: "name", value: "Name" },
                            { key: "id", value: "Id" },
                            { key: "account-number", value: "Account Number" },
                        ]} />
                </div>
                <div className="column is-half">
                    <InputSelect label="Source account column"
                        value={this.state.mapSourceAccountColumn}
                        placeholder={"Select column"}
                        onChange={result => this.setState({ mapSourceAccountColumn: result })}
                        items={Object.keys(this.props.data[0]).map(item => {
                            return {
                                key: item,
                                value: item,
                            }
                        })} />
                </div>
            </div>

            <div className="columns">
                <div className="column is-half">
                    <InputSelect label="Destination account identifier"
                        value={this.state.mapDestinationAccountIdentifier}
                        placeholder={"Select variable"}
                        onChange={result => this.setState({ mapDestinationAccountIdentifier: result as AccountIdentifier })}
                        items={[
                            { key: "name", value: "Name" },
                            { key: "id", value: "Id" },
                            { key: "account-number", value: "Account Number" },
                        ]} />
                </div>
                <div className="column is-half">
                    <InputSelect label="Destination account column"
                        value={this.state.mapDestinationAccountColumn}
                        placeholder={"Select column"}
                        onChange={result => this.setState({ mapDestinationAccountColumn: result })}
                        items={Object.keys(this.props.data[0]).map(item => {
                            return {
                                key: item,
                                value: item,
                            }
                        })} />
                </div>
            </div>

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
                        <td>{this.printAccount(this.state.mapSourceAccountIdentifier, row.row[this.state.mapSourceAccountColumn])}</td>
                        <td>{this.printAccount(this.state.mapDestinationAccountIdentifier, row.row[this.state.mapDestinationAccountColumn])}</td>
                        <td></td>
                    </tr>
                )}
            </tbody>
        </table>;
    }

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>): void {
        if (this.props.data != prevProps.data
            || this.state.rowOffset != prevState.rowOffset
            || this.state.mapSourceAccountColumn != prevState.mapSourceAccountColumn
            || this.state.mapSourceAccountIdentifier != prevState.mapSourceAccountIdentifier
            || this.state.mapDestinationAccountColumn != prevState.mapDestinationAccountColumn
            || this.state.mapDestinationAccountIdentifier != prevState.mapDestinationAccountIdentifier) {
            
            // Refetch accounts from the server based on the identifier
            const rows = this.props.data
                .map((row, i) => {
                    return {
                        row: row,
                        rowNumber: i,
                    }
                })
                .slice(this.state.rowOffset * pageSize, (this.state.rowOffset + 1) * pageSize);
            
            let newAccounts = this.state.accountsBy;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i].row;
                if (newAccounts[this.state.mapSourceAccountIdentifier] === undefined) {
                    newAccounts[this.state.mapSourceAccountIdentifier] = {};
                }
                if (newAccounts[this.state.mapSourceAccountIdentifier][(row as any)[this.state.mapSourceAccountColumn]] === undefined) {
                    newAccounts[this.state.mapSourceAccountIdentifier][(row as any)[this.state.mapSourceAccountColumn]] = "loading";
                }
                if (newAccounts[this.state.mapDestinationAccountIdentifier] === undefined) {
                    newAccounts[this.state.mapDestinationAccountIdentifier] = {};
                }
                if (newAccounts[this.state.mapDestinationAccountIdentifier][(row as any)[this.state.mapDestinationAccountColumn]] === undefined) {
                    newAccounts[this.state.mapDestinationAccountIdentifier][(row as any)[this.state.mapDestinationAccountColumn]] = "loading";
                }
            }
            this.setState({ accountsBy: { ...newAccounts } }, () => {
                axios.post(`https://localhost:7262/Account/Search`, {
                    query: {
                        type: 0,
                        children: [
                            {
                                type: 2,
                                children: [],
                                query: {
                                    column: this.capitalize(this.state.mapSourceAccountIdentifier),
                                    operator: 1,
                                    value: rows.map(row => row.row[this.state.mapSourceAccountColumn]),
                                }
                            },
                            {
                                type: 2,
                                children: [],
                                query: {
                                    column: this.capitalize(this.state.mapDestinationAccountIdentifier),
                                    operator: 1,
                                    value: rows.map(row => row.row[this.state.mapDestinationAccountColumn]),
                                }
                            }
                        ]
                    }
                }).then(res => {
                    let newAccounts = this.state.accountsBy;
                    for (let i = 0; i < res.data.length; i++) {
                        let account = res.data[i];
                        this.state.accountsBy[this.state.mapSourceAccountIdentifier][account[this.state.mapSourceAccountIdentifier]] = account;
                        this.state.accountsBy[this.state.mapDestinationAccountIdentifier][account[this.state.mapDestinationAccountIdentifier]] = account;
                    }
                    this.setState({
                        accountsBy: { ...newAccounts }
                    });
                });
            });
        }
    }

    private capitalize(word: string) {
        const lower = word.toLowerCase();
        return word.charAt(0).toUpperCase() + lower.slice(1);
    }

    private printAccount(identifier: AccountIdentifier, identifierValue: string)
    {
        if (this.state.accountsBy[identifier] === undefined) {
            return "…";
        }
        let value = this.state.accountsBy[identifier][identifierValue];
        if (value == "loading" || value === undefined) return "…";
        if (value == "not-found") return "";
        return "#" + value.id + " " + value.name;
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
