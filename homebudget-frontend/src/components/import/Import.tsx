import axios from "axios";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { Api } from "../../lib/ApiClient";
import { formatDateTimeWithPrefs } from "../../lib/Utils";
import { Account } from "../../models/account";
import { CreateTransaction } from "../../models/transaction";
import AccountLink from "../account/AccountLink";
import { preferencesContext } from "../App";
import { Card } from "../common/Card";
import Table from "../common/Table";
import InputButton from "../input/InputButton";
import { AccountReference, CsvCreateTransaction } from "./ImportModels";

interface Props {
    transactions: CsvCreateTransaction[];
    accountsBy: { [identifier: string]: { [value: string]: Account } };
    batchSize: number;
    goToPrevious: () => void;
}

interface State {
    succeeded: CreateTransaction[],
    failed: CreateTransaction[],
    duplicate: CreateTransaction[],

    state: "waiting" | "importing" | "imported";
    progress: number;
}

/*
 * React object class
 */
export function Import (props: Props) {
    const [succeeded, setSucceeded] = React.useState<CreateTransaction[]>([])
    const [failed, setFailed] = React.useState<CreateTransaction[]>([])
    const [duplicate, setDuplicate] = React.useState<CreateTransaction[]>([])
    const [state, setState] = React.useState<"waiting" | "importing" | "imported">("waiting");
    const [progress, setProgress] = React.useState(0);
    const [page, setPage] = React.useState(1);

    const { preferences } = React.useContext(preferencesContext);

    switch (state) {
        case "waiting":
            return <Card title="Begin import">
                <InputButton onClick={() => importTransactions()}>Import Transactions</InputButton>
                <div className="buttons mt-3">
                    <InputButton onClick={() => props.goToPrevious()}>Back</InputButton>
                </div>
            </Card>;
        case "importing":
            return <Card title="Importing&hellip;">
                <p>{progress} of {props.transactions.length} transactions have been imported.</p>
                <p>Please wait while the import is completed</p>
            </Card>;
        case "imported":
            return <>
                <Card title="Import complete">Your transactions have been imported</Card>
                <Card title="Succeeded">
                    <p className="mb-3">The following transactions were successfully created:</p>
                    {transactionTable(succeeded)}
                </Card>
                <Card title="Duplicate">
                    <p className="mb-3">The following transactions could not be created due to duplicate identifiers:</p>
                    {transactionTable(duplicate)}
                </Card>
                <Card title="Failed">
                    <p className="mb-3">The following transactions could not be created due to errors:</p>
                    {transactionTable(failed)}
                </Card>
            </>;
    }

    function transactionTable(transactions: CreateTransaction[]) {
        return <Table pageSize={20}
            renderItem={(transaction, i) => <tr key={i}>
                <td>{transaction.identifier}</td>
                <td>{formatDateTimeWithPrefs(transaction.dateTime, preferences)}</td>
                <td>{transaction.description}</td>
                <td>{transaction.sourceId && <AccountLink account={props.accountsBy["id"][transaction.sourceId]} />}</td>
                <td>{transaction.destinationId && <AccountLink account={props.accountsBy["id"][transaction.destinationId]} />}</td>
            </tr>}
            page={page}
            goToPage={setPage}
            type="sync"
            renderType="table"
            headings={<tr>
                <th>Identifier</th>
                <th>Created</th>
                <th>Description</th>
                <th>Source</th>
                <th>Destination</th>
            </tr>} items={transactions} />;
    }

    async function importTransactions() {
        setState("importing");

        // Don't send transactions with known errors to the server
        let errors = props.transactions.map(t =>
            t.amount === "invalid" ||
            !t.dateTime.isValid ||
            (t.source && t.destination && t.source.identifier == t.destination.identifier && t.source.value == t.destination.value)
        );
        let invalidTransactions = props.transactions.filter((_, i) => errors[i]).map(transaction => {
            return {
                dateTime: transaction.dateTime.isValid ? transaction.dateTime : DateTime.fromJSDate(new Date(2000, 1, 1)),
                description: transaction.description,
                sourceId: getAccount(transaction.source)?.id,
                destinationId: getAccount(transaction.destination)?.id,
                identifier: transaction.identifier,
                category: "",
                total: transaction.amount,
                lines: []
            } as CreateTransaction
        });
        let progress = invalidTransactions.length;
        let succeeded: CreateTransaction[] = [];
        let failed: CreateTransaction[]  = invalidTransactions;
        let duplicate: CreateTransaction[]  = []

        setProgress(progress);
        setSucceeded(succeeded);
        setFailed(failed);
        setDuplicate(duplicate);
        
        let createModels = props.transactions.filter((_, i) => ! errors[i]).map(transaction => {
            return {
                dateTime: transaction.dateTime,
                description: transaction.description,
                sourceId: getAccount(transaction.source)?.id,
                destinationId: getAccount(transaction.destination)?.id,
                identifier: transaction.identifier,
                category: "",
                total: transaction.amount,
                lines: []
            } as CreateTransaction
        });

        while (progress - invalidTransactions.length < createModels.length - 1) {
            let result = await Api.Transaction.createMany(
                createModels.slice(progress - invalidTransactions.length, progress - invalidTransactions.length + props.batchSize)
            );
            
            progress += props.batchSize;
            succeeded = [...succeeded, ...result.succeeded];
            failed = [...failed, ...result.failed];
            duplicate = [...duplicate, ...result.duplicate];

            setProgress(progress);
            setSucceeded(succeeded);
            setFailed(failed);
            setDuplicate(duplicate);
        }

        setState("imported");
    }

    function getAccount(reference: AccountReference | null): Account | null {
        if (reference === null || reference === undefined) return null;
        if (props.accountsBy[reference.identifier] === undefined) return null;
        if (props.accountsBy[reference.identifier][reference.value] === undefined) return null;

        return props.accountsBy[reference.identifier][reference.value];
    }
}
