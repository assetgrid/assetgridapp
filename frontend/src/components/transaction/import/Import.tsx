import axios from "axios";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { Api, useApi } from "../../../lib/ApiClient";
import { formatDateTimeWithUser } from "../../../lib/Utils";
import { Account, CreateAccount, GetMovementAllResponse, GetMovementResponse, TimeResolution } from "../../../models/account";
import { Ok, BadRequest, NotFound, Forbid } from "../../../models/api";
import { CsvImportProfile } from "../../../models/csvImportProfile";
import { Preferences } from "../../../models/preferences";
import { SearchRequest, SearchResponse, SearchGroup } from "../../../models/search";
import { CreateTransaction, Transaction, TransactionListResponse, UpdateTransaction } from "../../../models/transaction";
import AccountLink from "../../account/AccountLink";
import { userContext } from "../../App";
import Card from "../../common/Card";
import Modal from "../../common/Modal";
import Table from "../../common/Table";
import InputAutocomplete from "../../input/InputAutocomplete";
import InputButton from "../../input/InputButton";
import InputText from "../../input/InputText";
import { CsvCreateTransaction } from "./importModels";

interface Props {
    profile: CsvImportProfile;
    transactions: CsvCreateTransaction[];
    batchSize: number;
    goToPrevious: () => void;
    accounts: Account[];
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
    const [isSavingProfile, setIsSavingProfile] = React.useState(false);
    const api = useApi();

    const { user } = React.useContext(userContext);

    switch (state) {
        case "waiting":
            return <Card isNarrow={true} title="Begin import">
                <div className="buttons mt-3">
                    <InputButton className="is-primary" disabled={api === null} onClick={() => importTransactions()}>Import Transactions</InputButton>
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

    function transactionTable(transactions: CreateTransaction[]) {
        return <Table pageSize={20}
            renderItem={(transaction, i) => <tr key={i}>
                <td>{transaction.identifiers[0] ?? "None"}</td>
                <td>{formatDateTimeWithUser(transaction.dateTime, user)}</td>
                <td>{transaction.description}</td>
                <td>{transaction.sourceId && <AccountLink account={props.accounts.find(account => account.id === transaction.sourceId)!} targetBlank={true} />}</td>
                <td>{transaction.destinationId && <AccountLink account={props.accounts.find(account => account.id === transaction.destinationId)!} targetBlank={true} />}</td>
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
        if (api === null) return;

        setState("importing");

        // Don't send transactions with known errors to the server
        let errors = props.transactions.map(t =>
            t.amount === "invalid" ||
            !t.dateTime.isValid ||
            (t.source?.id === t.destination?.id)
        );
        let invalidTransactions = props.transactions.filter((_, i) => errors[i]).map(transaction => {
            return {
                dateTime: transaction.dateTime.isValid ? transaction.dateTime : DateTime.fromJSDate(new Date(2000, 1, 1)),
                description: transaction.description,
                sourceId: transaction.source?.id,
                destinationId: transaction.destination?.id,
                identifiers: [ transaction.identifier ],
                category: transaction.category,
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
                sourceId: transaction.source?.id,
                destinationId: transaction.destination?.id,
                identifiers: [ transaction.identifier ],
                category: transaction.category,
                total: transaction.amount,
                lines: []
            } as CreateTransaction
        });

        while (progress - invalidTransactions.length < createModels.length - 1) {
            let result = await api.Transaction.createMany(
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
    active: boolean;
    close: () => void;
    profile: CsvImportProfile;
}
function SaveProfileModal(props: SaveProfileModalProps): React.ReactElement {
    const [name, setName] = React.useState("");
    const [nameError, setNameError] = React.useState<string | null>(null);
    const [isCreating, setIsSaving] = React.useState(false);
    const api = useApi();

    return <Modal
        active={props.active}
        title={"Merge transactions"}
        close={() => props.close()}
        footer={<>
            {<InputButton onClick={() => saveProfile()} disabled={isCreating || api === null} className="is-primary">Save profile</InputButton>}
            <button className="button" onClick={() => props.close()}>Cancel</button>
        </>}>
        <div style={{ minHeight: "20rem" }}>
            <InputImportProfile
                label="Profile name"
                value={name}
                onChange={value => setName(value)}
                disabled={isCreating}
                errors={nameError ? [nameError] : undefined} />
        </div>
    </Modal>;

    async function saveProfile() {
        if (api === null) return;

        setIsSaving(true);
        await api.User.updateCsvImportProfile(name, props.profile);
        setIsSaving(false);
    }
}

interface InputImportProfileProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    disabled: boolean;
    errors?: string[];
}
function InputImportProfile(props: InputImportProfileProps) {
    const profilesRef = React.useRef<string[] | Promise<string[]> | null>(null);

    return <InputAutocomplete value={props.value}
        disabled={props.disabled}
        onChange={props.onChange}
        label={props.label}
        errors={props.errors}
        refreshSuggestions={(api: Api, prefix: string) => {
            if (profilesRef.current === null) {
                // No profiles have been fetched. Start the fetch job
                profilesRef.current = new Promise<string[]>(resolve => {
                    api.User.getCsvImportProfiles().then(result => {
                        profilesRef.current = result.data;
                        resolve(result.data.filter(profile => profile.toLowerCase().indexOf(prefix.toLowerCase()) >= 0));
                    });
                });
                return profilesRef.current;
            } else if (Array.isArray(profilesRef.current)) {
                // Profiles have been fetched
                return new Promise<string[]>(resolve => {
                    resolve((profilesRef.current as string[]).filter(profile => profile.toLowerCase().indexOf(prefix.toLowerCase()) >= 0));
                });
            } else {
                // Profiles are fetching
                return profilesRef.current;
            }
        }} />;
}