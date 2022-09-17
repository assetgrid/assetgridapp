import React = require("react");
import { Account } from "../../../models/account";
import { Message } from "../../common/Message";
import InputButton from "../../input/InputButton";
import { CsvCreateTransaction } from "../ImportModels";
import { CsvMappingTableFilter } from "./MapCsvFields";

interface Props {
    transactions: CsvCreateTransaction[];
    accountsBy: { [key: string]: { [value: string]: Account | "fetching" | null } };
    duplicateIdentifiers: Set<string> | "fetching";
    setTableFilter: (newFilter: CsvMappingTableFilter) => void;
}

export default function CsvMappingIssues(props: Props): React.ReactElement {
    // Waiting for a server call before the issues can be shown
    const fetching = props.transactions === null ||
        props.transactions.some(t =>
            (t.source && props.accountsBy[t.source.identifier] && props.accountsBy[t.source.identifier][t.source.value] === "fetching") ||
            (t.destination && props.accountsBy[t.destination.identifier] && props.accountsBy[t.destination.identifier][t.destination.value] === "fetching")
        ) ||
        props.duplicateIdentifiers === "fetching";

    if (fetching) {
        return <>Processing&hellip; Please wait.</>;
    }

    const referenceToMissingAccountCount = props.transactions.filter(t => 
        (t.source && props.accountsBy[t.source.identifier][t.source.value] === null) ||
        (t.destination && props.accountsBy[t.destination.identifier][t.destination.value] === null)
    ).length;
    const noAccountCount = props.transactions.filter(t =>
        (t.source === null || props.accountsBy[t.source.identifier][t.source.value] === null) &&
        (t.destination === null || props.accountsBy[t.destination.identifier][t.destination.value] === null)
    ).length;
    const sameSourceDestinationCount = props.transactions.filter(t =>
        t.source && t.destination && t.source.identifier == t.destination.identifier && t.source.value == t.destination.value
    ).length;
    const duplicateCount = props.transactions.filter(t => t.identifier && (props.duplicateIdentifiers as Set<string>).has(t.identifier)).length;
    const errorCount = props.transactions.filter(t => t.amount === "invalid" || !t.dateTime.isValid).length;
    const allCount = referenceToMissingAccountCount + noAccountCount + duplicateCount + errorCount;
    
    return <>
        {allCount == 0
            ? <p className="mb-3">No issues detected</p>
            : <Message title="Problems detected" type="danger">
                The following issues were detected:
                <div className="content">
                    <ul>
                        {referenceToMissingAccountCount > 0 && <li>
                            {referenceToMissingAccountCount} transactions reference a source or destination account that doesn't exist. They will be created without this account.{" "}
                            <a className="has-text-link" onClick={() => props.setTableFilter("reference-to-missing-account")}>Show transactions</a>
                        </li>}
                        {noAccountCount > 0 && <li>
                            {noAccountCount} transactions do not have a source nor destination. They will not be created{" "}
                            <a className="has-text-link" onClick={() => props.setTableFilter("no-account")}>Show transactions</a>
                        </li>}
                        {sameSourceDestinationCount > 0 && <li>
                            {sameSourceDestinationCount} transactions have the same source and destination. They will not be created{" "}
                            <a className="has-text-link" onClick={() => props.setTableFilter("same-account")}>Show transactions</a>
                        </li>}
                        {duplicateCount > 0 && <li>
                            {duplicateCount} transactions have duplicate identifiers. Only one transaction can exist for each identifier.{" "}
                            <a className="has-text-link" onClick={() => props.setTableFilter("duplicate")}>Show transactions</a>
                        </li>}
                        {errorCount > 0 && <li>
                            {errorCount} transactions have errors. They will not be created{" "}
                            <a className="has-text-link" onClick={() => props.setTableFilter("error")}>Show transactions</a>
                        </li>}
                    </ul>
                </div>
            </Message>
        }
    </>;
}