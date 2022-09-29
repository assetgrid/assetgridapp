import * as React from "react";
import { formatDateTimeWithUser, formatNumberWithUser } from "../../../../lib/Utils";
import { Account } from "../../../../models/account";
import { userContext } from "../../../App";
import Table from "../../../common/Table";
import Tooltip from "../../../common/Tooltip";
import { AccountReference, CsvCreateTransaction } from "../importModels";
import DuplicateIndicator from "./DuplicateIndicator";
import { CsvMappingTableFilter } from "./MapCsvFields";
import TableAccount from "./TableAccount";

interface Props {
    transactions: CsvCreateTransaction[];
    accountsBy: { [key: string]: { [value: string]: Account | "fetching" | null } };
    duplicateIdentifiers: Set<string> | "fetching";
    tableFilter: CsvMappingTableFilter;
    tableDraw: number;
    beginCreatingAccount: (reference: AccountReference) => void;
}

export default function CsvMappingTransactionTable(props: Props): React.ReactElement {
    const { user } = React.useContext(userContext);
    const [page, setPage] = React.useState(1);

    if (props.transactions === null) {
        return <p>Loading</p>;
    }

    let items = props.transactions;
    if (props.tableFilter !== "all") {
        const fetching = props.transactions === null ||
            props.transactions.some(t =>
                (t.source && props.accountsBy[t.source.identifier] && props.accountsBy[t.source.identifier][t.source.value] === "fetching") ||
                (t.destination && props.accountsBy[t.destination.identifier] && props.accountsBy[t.destination.identifier][t.destination.value] === "fetching")
            ) ||
            props.duplicateIdentifiers === "fetching";
        
        if (fetching) return <p>Loading</p>;

        switch (props.tableFilter) {
            case "reference-to-missing-account":
                items = props.transactions.filter(t =>
                    (t.source && props.accountsBy[t.source.identifier][t.source.value] === null) ||
                    (t.destination && props.accountsBy[t.destination.identifier][t.destination.value] === null)
                );
                break;
            case "no-account":
                items = props.transactions.filter(t =>
                    (t.source === null || props.accountsBy[t.source.identifier][t.source.value] === null) &&
                    (t.destination === null || props.accountsBy[t.destination.identifier][t.destination.value] === null)
                );
                break;
            case "same-account":
                items = props.transactions.filter(t =>
                    t.source && t.destination && t.source.identifier == t.destination.identifier && t.source.value == t.destination.value
                );
                break;
            case "duplicate":
                items = props.transactions.filter(t => t.identifier && (props.duplicateIdentifiers as Set<string>).has(t.identifier));
                break;
            case "error":
                items = props.transactions.filter(t => t.amount === "invalid" || !t.dateTime.isValid);
                break;
        }
    }

    return <Table pageSize={20}
        items={items}
        headings={<tr>
            <th>Identifier</th>
            <th>Timestamp</th>
            <th>Description</th>
            <th className="has-text-right">Amount</th>
            <th>Source</th>
            <th>Destination</th>
            <th>Category</th>
        </tr>}
        draw={props.tableDraw}
        type="sync"
        page={page}
        goToPage={setPage}
        renderType="table"
        renderItem={transaction =>
            <tr key={transaction.rowNumber}>
                <td>{transaction.identifier && <DuplicateIndicator identifier={transaction.identifier} duplicateIdentifiers={props.duplicateIdentifiers} />}
                    {transaction.identifier === null ? "None" : (transaction.identifier.length < 30
                        ? transaction.identifier
                        : <Tooltip content={transaction.identifier}>
                            {transaction.identifier.substring(0, 30) + "…"}
                        </Tooltip>)
                }</td>
                <td>
                    <Tooltip content={<>Parsed from: "{transaction.dateText}"</>}>
                        {formatDateTimeWithUser(transaction.dateTime, user)}
                    </Tooltip>
                </td>
                <td>{transaction.description}</td>
                <td style={{ textAlign: "right" }}>
                    {transaction.amount === "invalid" ? "invalid amount" : formatNumberWithUser(transaction.amount, user)}
                </td>
                <td>
                    <TableAccount reference={transaction.source} accountsBy={props.accountsBy} beginCreatingAccount={props.beginCreatingAccount} />
                </td>
                <td>
                    <TableAccount reference={transaction.destination} accountsBy={props.accountsBy} beginCreatingAccount={props.beginCreatingAccount} />
                </td>
                <td>
                    {transaction.category}
                </td>
            </tr>}
    />;
}