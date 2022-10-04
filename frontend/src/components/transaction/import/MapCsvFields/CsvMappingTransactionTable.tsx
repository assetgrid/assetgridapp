import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import { formatDateTimeWithUser, formatNumberWithUser } from "../../../../lib/Utils";
import { Account } from "../../../../models/account";
import { CsvImportProfile } from "../../../../models/csvImportProfile";
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
    options: CsvImportProfile;
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
                    {displayIdentifier(transaction)}
                </td>
                <td>{displayTimestamp(transaction)}</td>
                <td>{transaction.description}</td>
                <td style={{ textAlign: "right" }}>
                    {displayAmount(transaction)}
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

    function displayIdentifier(transaction: CsvCreateTransaction) {
        if (props.options.duplicateHandling === "automatic") {
            if (transaction.identifier === null || transaction.identifier.trim() === "") {
                return <Tooltip content="Could not calculate identifier for this transaction">
                    <span className="icon has-text-danger">
                        <FontAwesomeIcon icon={faExclamationTriangle} />
                    </span> None
                </Tooltip>;
            } else {
                return <Tooltip content={transaction.identifier}>
                    <span className="has-text-link">auto</span>
                </Tooltip>;
            }
        } else if (transaction.identifier === null || transaction.identifier.trim() === "") {
            return <Tooltip content="Ignore duplicates for this transaction">
                None
            </Tooltip>;
        } else {
            if (transaction.identifier.length < 20) {
                return transaction.identifier;
            } else {
                return <Tooltip content={transaction.identifier}>
                    {transaction.identifier.substring(0, 20) + "…"}
                </Tooltip>;
            }
        }
    }

    function displayTimestamp(transaction: CsvCreateTransaction) {
        if (transaction.dateTime.isValid) {
            return <Tooltip content={<>Parsed from: "{transaction.dateText}"</>}>
                {formatDateTimeWithUser(transaction.dateTime, user)}
            </Tooltip>;
        } else {
            return <Tooltip content={<>Parsed from: "{transaction.dateText}"</>}>
                <span className="icon has-text-danger">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                </span> Could not parse timestamp
            </Tooltip>;
        }
    }

    function displayAmount(transaction: CsvCreateTransaction) {
        if (transaction.amount !== "invalid") {
            return <Tooltip content={<>Parsed from: "{transaction.amountText}"</>}>
                {formatNumberWithUser(transaction.amount, user)}
            </Tooltip>;
        } else {
            return <Tooltip content={<>Parsed from: "{transaction.amountText}"</>}>
                <span className="icon has-text-danger">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                </span> Could not parse amount
            </Tooltip>;
        }
    }
}