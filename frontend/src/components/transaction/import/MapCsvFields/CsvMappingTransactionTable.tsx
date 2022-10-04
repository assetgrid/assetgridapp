import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import { formatDateTimeWithUser, formatNumberWithUser } from "../../../../lib/Utils";
import { Account } from "../../../../models/account";
import { CsvImportProfile } from "../../../../models/csvImportProfile";
import { Transaction } from "../../../../models/transaction";
import AccountLink from "../../../account/AccountLink";
import { userContext } from "../../../App";
import Table from "../../../common/Table";
import Tooltip from "../../../common/Tooltip";
import { CsvCreateTransaction } from "../importModels";
import DuplicateIndicator from "./DuplicateIndicator";

interface Props {
    transactions: CsvCreateTransaction[];
    duplicateIdentifiers: Set<string> | "fetching";
    tableFilter: (transaction: CsvCreateTransaction) => boolean;
    tableDraw: number;
    options: CsvImportProfile;
}

export default function CsvMappingTransactionTable(props: Props): React.ReactElement {
    const { user } = React.useContext(userContext);
    const [page, setPage] = React.useState(1);
    
    if (props.transactions === null) {
        return <p>Loading</p>;
    }

    let items = props.transactions.filter(props.tableFilter);

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
                    {props.options.sourceAccountType === "single"
                        ? (transaction.source !== null ? <AccountLink account={transaction.source} targetBlank={true} /> : <>None</>)
                        : <Tooltip content={"Identifier: '" + transaction.sourceText + "'"}>
                            {transaction.source !== null ? <AccountLink account={transaction.source} targetBlank={true} /> : <>None</>}
                        </Tooltip>}
                </td>
                <td>
                    {props.options.destinationAccountType === "single"
                        ? (transaction.destination !== null ? <AccountLink account={transaction.destination} targetBlank={true} /> : <>None</>)
                        : <Tooltip content={"Identifier: '" + transaction.destinationText + "'"}>
                            {transaction.destination !== null ? <AccountLink account={transaction.destination} targetBlank={true} /> : <>None</>}
                        </Tooltip>}
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