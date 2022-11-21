import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Api, useApi } from "../../../lib/ApiClient";
import { forget, formatDateTimeWithUser } from "../../../lib/Utils";
import { Account } from "../../../models/account";
import { CsvImportProfile } from "../../../models/csvImportProfile";
import { SearchGroupType, SearchOperator } from "../../../models/search";
import { ModifyTransaction, Transaction } from "../../../models/transaction";
import AccountLink from "../../account/AccountLink";
import { useUser } from "../../App";
import Card from "../../common/Card";
import Modal from "../../common/Modal";
import Table from "../../common/Table";
import InputAutoComplete from "../../input/InputAutoComplete";
import InputButton from "../../input/InputButton";
import TransactionList from "../table/TransactionList";
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
    const [succeeded, setSucceeded] = React.useState<Transaction[]>([]);
    const [failed, setFailed] = React.useState<ModifyTransaction[]>([]);
    const [duplicate, setDuplicate] = React.useState<ModifyTransaction[]>([]);
    const [state, setState] = React.useState<"waiting" | "importing" | "imported">("waiting");
    const [progress, setProgress] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const [isSavingProfile, setIsSavingProfile] = React.useState(false);
    const api = useApi();
    const { t } = useTranslation();
    const user = useUser();

    switch (state) {
        case "waiting":
            return <Card isNarrow={true} title="Begin import">
                <div className="buttons mt-3">
                    <InputButton className="is-primary"
                        disabled={api === null}
                        onClick={forget(importTransactions)}>
                        {t("import.import_transactions")}
                    </InputButton>
                    <InputButton className="is-primary"
                        disabled={api === null}
                        onClick={() => setIsSavingProfile(true)}>
                        {t("import.save_import_profile")}
                    </InputButton>
                    <InputButton onClick={() => props.goToPrevious()}>
                        {t("common.back")}
                    </InputButton>
                </div>
                <SaveProfileModal active={isSavingProfile} close={() => setIsSavingProfile(false)} profile={props.profile} />
            </Card>;
        case "importing":
            return <Card isNarrow={true} title={t("import.importing")!}>
                <p>{t("import.transaction_import_progress", { completed: progress, count: props.transactions.length })}</p>
                <p>{t("import.please_wait_until_import_comlpete")}</p>
            </Card>;
        case "imported":
            return <>
                <Card title={t("import.import_completed")!} isNarrow={true}>
                    {t("import.transactions_have_been_completed")}
                    <div className="buttons mt-3">
                        <InputButton className="is-primary" disabled={api === null} onClick={() => setIsSavingProfile(true)}>
                            {t("import.save_import_profile")}
                        </InputButton>
                    </div>
                </Card>
                <Card title={t("import.succeeded")!} isNarrow={false}>
                    <p className="mb-3">{t("import.following_successfully_created")!}</p>
                    <TransactionList draw={0} allowEditing={false} allowLinks={false} query={{
                        type: SearchGroupType.Query,
                        query: {
                            column: "Id",
                            not: false,
                            operator: SearchOperator.In,
                            value: succeeded.map(x => x.id),
                            metaData: false
                        }
                    }} />
                </Card>
                <Card title={t("import.duplicate")!} isNarrow={false}>
                    <p className="mb-3">{t("import.following_failed_due_to_duplicates")!}</p>
                    {transactionTable(duplicate)}
                </Card>
                <Card title={t("import.failed")!} isNarrow={false}>
                    <p className="mb-3">{t("import.following_failed_due_to_errors")!}</p>
                    {transactionTable(failed)}
                </Card>
                <SaveProfileModal active={isSavingProfile} close={() => setIsSavingProfile(false)} profile={props.profile} />
            </>;
    }

    function transactionTable (transactions: ModifyTransaction[]): React.ReactElement {
        return <Table pageSize={20}
            renderItem={(transaction, i) => <tr key={i}>
                <td>{transaction.identifiers[0] ?? t("common.none")}</td>
                <td>{formatDateTimeWithUser(transaction.dateTime, user)}</td>
                <td>{transaction.description}</td>
                <td>{transaction.sourceId !== null && <AccountLink account={props.accounts.find(account => account.id === transaction.sourceId)!} targetBlank={true} />}</td>
                <td>{transaction.destinationId !== null && <AccountLink account={props.accounts.find(account => account.id === transaction.destinationId)!} targetBlank={true} />}</td>
            </tr>}
            page={page}
            goToPage={setPage}
            headings={<tr>
                <th>{t("common.identifier")}</th>
                <th>{t("common.timestamp")}</th>
                <th>{t("common.description")}</th>
                <th>{t("transaction.source")}</th>
                <th>{t("transaction.destination")}</th>
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
        const invalidTransactions: ModifyTransaction[] = props.transactions.filter((_, i) => errors[i]).map(transaction => ({
            dateTime: transaction.dateTime.isValid ? transaction.dateTime : DateTime.fromJSDate(new Date(2000, 1, 1)),
            description: transaction.description,
            sourceId: transaction.source?.id ?? null,
            destinationId: transaction.destination?.id ?? null,
            identifiers: transaction.identifier !== null ? [transaction.identifier] : [],
            total: transaction.amount === "invalid" ? new Decimal(0) : transaction.amount,
            isSplit: false,
            lines: [{ amount: transaction.amount as Decimal, category: transaction.category, description: "" }],
            metaData: null
        }));
        let progress = invalidTransactions.length;
        let succeeded: Transaction[] = [];
        let failed: ModifyTransaction[] = invalidTransactions;
        let duplicate: ModifyTransaction[] = [];

        setProgress(progress);
        setSucceeded(succeeded);
        setFailed(failed);
        setDuplicate(duplicate);

        const createModels: ModifyTransaction[] = props.transactions.filter((_, i) => !errors[i]).map(transaction => ({
            dateTime: transaction.dateTime,
            description: transaction.description,
            sourceId: transaction.source?.id ?? null,
            destinationId: transaction.destination?.id ?? null,
            identifiers: transaction.identifier !== null ? [transaction.identifier] : [],
            total: transaction.amount as Decimal, // We know it's not invalid as we filter those out earlier
            isSplit: false,
            lines: [{ amount: transaction.amount as Decimal, category: transaction.category, description: "" }],
            metaData: null
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
    const [hasSaved, setHasSaved] = React.useState(false);
    const { t } = useTranslation();

    return <Modal
        active={props.active}
        title={t("import.save_import_profile")}
        close={() => props.close()}
        footer={<>
            {<InputButton onClick={forget(saveProfile)} disabled={isCreating || api === null} className="is-primary">{t("import.save_import_profile")}</InputButton>}
            <button className="button" onClick={() => props.close()}>{t("common.cancel")}</button>
        </>}>
        <div style={{ minHeight: "20rem" }}>
            {hasSaved && <article className="message is-link">
                <div className="message-body">
                    {t("common.changes_have_been_saved")}
                </div>
            </article>}
            <InputImportProfile
                label={t("import.import_profile_name")!}
                value={name}
                onChange={value => setName(value)}
                disabled={isCreating}
                errors={nameError !== null ? [nameError] : undefined} />
        </div>
    </Modal>;

    async function saveProfile (): Promise<void> {
        if (api === null) return;

        setHasSaved(false);
        setIsSaving(true);
        await api.User.updateCsvImportProfile(name, props.profile);
        setIsSaving(false);
        setHasSaved(true);
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
