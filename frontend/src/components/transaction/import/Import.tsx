import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { Api, useApi } from "../../../lib/ApiClient";
import { forget, formatDateTimeWithUser } from "../../../lib/Utils";
import { Account } from "../../../models/account";
import { CsvImportProfile } from "../../../models/csvImportProfile";
import { CreateTransaction } from "../../../models/transaction";
import AccountLink from "../../account/AccountLink";
import { userContext } from "../../App";
import Card from "../../common/Card";
import Modal from "../../common/Modal";
import Table from "../../common/Table";
import InputAutoComplete from "../../input/InputAutoComplete";
import InputButton from "../../input/InputButton";
import { CsvCreateTransaction } from "./importModels";

interface Props {
    profile: CsvImportProfile
    transactions: CsvCreateTransaction[]
    batchSize: number
    goToPrevious: () => void
    accounts: Account[]
}

/*
 * React object class
 */
export function Import (props: Props): React.ReactElement {
    const [succeeded, setSucceeded] = React.useState<CreateTransaction[]>([]);
    const [failed, setFailed] = React.useState<CreateTransaction[]>([]);
    const [duplicate, setDuplicate] = React.useState<CreateTransaction[]>([]);
    const [state, setState] = React.useState<"waiting" | "importing" | "imported">("waiting");
    const [progress, setProgress] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const [isSavingProfile, setIsSavingProfile] = React.useState(false);
    const api = useApi();

    const { user } = React.useContext(userContext);

    switch (state) {
        case "waiting":
            return <Card isNarrow={true} title="Begin import">
                <div className="buttons mt-3">
                    <InputButton className="is-primary" disabled={api === null} onClick={forget(importTransactions)}>Import Transactions</InputButton>
                    <InputButton className="is-primary" disabled={api === null} onClick={() => setIsSavingProfile(true)}>Save import profile</InputButton>
                    <InputButton onClick={() => props.goToPrevious()}>Back</InputButton>
                </div>
                <SaveProfileModal active={isSavingProfile} close={() => setIsSavingProfile(false)} profile={props.profile} />
            </Card>;
        case "importing":
            return <Card isNarrow={true} title="Importing&hellip;">
                <p>{progress} of {props.transactions.length} transactions have been imported.</p>
                <p>Please wait while the import is completed</p>
            </Card>;
        case "imported":
            return <>
                <Card title="Import complete" isNarrow={true}>
                    Your transactions have been imported
                    <div className="buttons mt-3">
                        <InputButton className="is-primary" disabled={api === null} onClick={() => setIsSavingProfile(true)}>Save import profile</InputButton>
                    </div>
                </Card>
                <Card title="Succeeded" isNarrow={false}>
                    <p className="mb-3">The following transactions were successfully created:</p>
                    {transactionTable(succeeded)}
                </Card>
                <Card title="Duplicate" isNarrow={false}>
                    <p className="mb-3">The following transactions could not be created due to duplicate identifiers:</p>
                    {transactionTable(duplicate)}
                </Card>
                <Card title="Failed" isNarrow={false}>
                    <p className="mb-3">The following transactions could not be created due to errors:</p>
                    {transactionTable(failed)}
                </Card>
                <SaveProfileModal active={isSavingProfile} close={() => setIsSavingProfile(false)} profile={props.profile} />
            </>;
    }

    function transactionTable (transactions: CreateTransaction[]): React.ReactElement {
        return <Table pageSize={20}
            renderItem={(transaction, i) => <tr key={i}>
                <td>{transaction.identifiers[0] ?? "None"}</td>
                <td>{formatDateTimeWithUser(transaction.dateTime, user)}</td>
                <td>{transaction.description}</td>
                <td>{transaction.sourceId !== null && <AccountLink account={props.accounts.find(account => account.id === transaction.sourceId)!} targetBlank={true} />}</td>
                <td>{transaction.destinationId !== null && <AccountLink account={props.accounts.find(account => account.id === transaction.destinationId)!} targetBlank={true} />}</td>
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

    async function importTransactions (): Promise<void> {
        if (api === null) return;

        setState("importing");

        // Don't send transactions with known errors to the server
        const errors = props.transactions.map(t =>
            t.amount === "invalid" ||
            !t.dateTime.isValid ||
            (t.source?.id === t.destination?.id)
        );
        const invalidTransactions: CreateTransaction[] = props.transactions.filter((_, i) => errors[i]).map(transaction => ({
            dateTime: transaction.dateTime.isValid ? transaction.dateTime : DateTime.fromJSDate(new Date(2000, 1, 1)),
            description: transaction.description,
            sourceId: transaction.source?.id ?? null,
            destinationId: transaction.destination?.id ?? null,
            identifiers: transaction.identifier !== null ? [transaction.identifier] : [],
            total: transaction.amount === "invalid" ? new Decimal(0) : transaction.amount,
            isSplit: false,
            lines: [{ amount: transaction.amount as Decimal, category: transaction.category, description: "" }]
        }));
        let progress = invalidTransactions.length;
        let succeeded: CreateTransaction[] = [];
        let failed: CreateTransaction[] = invalidTransactions;
        let duplicate: CreateTransaction[] = [];

        setProgress(progress);
        setSucceeded(succeeded);
        setFailed(failed);
        setDuplicate(duplicate);

        const createModels: CreateTransaction[] = props.transactions.filter((_, i) => !errors[i]).map(transaction => ({
            dateTime: transaction.dateTime,
            description: transaction.description,
            sourceId: transaction.source?.id ?? null,
            destinationId: transaction.destination?.id ?? null,
            identifiers: transaction.identifier !== null ? [transaction.identifier] : [],
            total: transaction.amount as Decimal, // We know it's not invalid as we filter those out earlier
            isSplit: false,
            lines: [{ amount: transaction.amount as Decimal, category: transaction.category, description: "" }]
        }));

        while (progress - invalidTransactions.length < createModels.length - 1) {
            const result = await api.Transaction.createMany(
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
}

interface SaveProfileModalProps {
    active: boolean
    close: () => void
    profile: CsvImportProfile
}
function SaveProfileModal (props: SaveProfileModalProps): React.ReactElement {
    const [name, setName] = React.useState("");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [nameError, setNameError] = React.useState<string | null>(null);
    const [isCreating, setIsSaving] = React.useState(false);
    const api = useApi();

    return <Modal
        active={props.active}
        title={"Merge transactions"}
        close={() => props.close()}
        footer={<>
            {<InputButton onClick={forget(saveProfile)} disabled={isCreating || api === null} className="is-primary">Save profile</InputButton>}
            <button className="button" onClick={() => props.close()}>Cancel</button>
        </>}>
        <div style={{ minHeight: "20rem" }}>
            <InputImportProfile
                label="Profile name"
                value={name}
                onChange={value => setName(value)}
                disabled={isCreating}
                errors={nameError !== null ? [nameError] : undefined} />
        </div>
    </Modal>;

    async function saveProfile (): Promise<void> {
        if (api === null) return;

        setIsSaving(true);
        await api.User.updateCsvImportProfile(name, props.profile);
        setIsSaving(false);
    }
}

interface InputImportProfileProps {
    value: string
    onChange: (value: string) => void
    label?: string
    disabled: boolean
    errors?: string[]
}
function InputImportProfile (props: InputImportProfileProps): React.ReactElement {
    const profilesRef = React.useRef<string[] | Promise<string[]> | null>(null);

    return <InputAutoComplete value={props.value}
        disabled={props.disabled}
        onChange={props.onChange}
        allowNull={false}
        label={props.label}
        errors={props.errors}
        refreshSuggestions={async (api: Api, prefix: string) => {
            if (profilesRef.current === null) {
                // No profiles have been fetched. Start the fetch job
                profilesRef.current = (async () => {
                    const result = await api.User.getCsvImportProfiles();
                    profilesRef.current = result.data;
                    return result.data.filter(profile => profile.toLowerCase().includes(prefix.toLowerCase()));
                })();
                return await profilesRef.current;
            } else if (Array.isArray(profilesRef.current)) {
                // Profiles have been fetched
                return await new Promise<string[]>(resolve => {
                    resolve((profilesRef.current as string[]).filter(profile => profile.toLowerCase().includes(prefix.toLowerCase())));
                });
            } else {
                // Profiles are fetching
                return await profilesRef.current;
            }
        }} />;
}
