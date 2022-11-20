import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { faPen, faPersonRunning } from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Api, useApi } from "../../../lib/ApiClient";
import { routes } from "../../../lib/routes";
import { forget } from "../../../lib/Utils";
import { TransactionAutomationPermissions, TransactionAutomationSummary } from "../../../models/automation/transactionAutomation";
import Card from "../../common/Card";
import Hero from "../../common/Hero";
import Modal from "../../common/Modal";
import Table from "../../common/Table";
import Tooltip from "../../common/Tooltip";
import InputButton from "../../input/InputButton";
import InputIconButton from "../../input/InputIconButton";
import YesNoDisplay from "../../input/YesNoDisplay";

export default function PageAutomation (): React.ReactElement {
    const api = useApi();
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [transactionAutomations, setTransactionAutomations] = React.useState<TransactionAutomationSummary[]>([]);
    const [transactionAutomationPage, setTransactionAutomationPage] = React.useState(1);
    const [transactionAutomationDeleting, setTransactionAutomationDeleting] = React.useState<TransactionAutomationSummary | null>(null);
    const { t } = useTranslation();

    React.useEffect(() => {
        if (api !== null) forget(refreshLists)(api);
    }, [api]);

    return <>
        <Hero title={t("automation.automation")} />
        <div className="p-3">
            <Card title={t("automation.transaction_automations")!} isNarrow={false}>
                <Table pageSize={10}
                    renderItem={(automation, i) => <tr key={i}>
                        <td>{automation.name}</td>
                        <td>{automation.description}</td>
                        <td><YesNoDisplay value={automation.enabled} /></td>
                        <td>
                            {automation.permissions === TransactionAutomationPermissions.Modify && <>
                                <Tooltip content={t("automation.transaction.run_on_existing")}>
                                    <Link to={routes.automationTransactionEdit(automation.id.toString())} state={{ expandPreview: true }}>
                                        <InputIconButton disabled={isUpdating} icon={faPersonRunning} />
                                    </Link>
                                </Tooltip>
                                <Link to={routes.automationTransactionEdit(automation.id.toString())}>
                                    <InputIconButton disabled={isUpdating} icon={faPen} />
                                </Link>
                                <InputIconButton disabled={isUpdating} icon={faTrashCan} onClick={() => setTransactionAutomationDeleting(automation)} />
                            </>}
                        </td>
                    </tr>}
                    page={transactionAutomationPage}
                    goToPage={setTransactionAutomationPage}
                    headings={<tr>
                        <th>{t("common.name")}</th>
                        <th>{t("common.description")}</th>
                        <th>{t("common.enabled")}</th>
                        <th>{t("common.actions")}</th>
                    </tr>} items={transactionAutomations} />
                <div className="buttons">
                    <Link to={routes.automationTransactionCreate()}
                        className="button is-primary">
                        {t("automation.create_transaction")}
                    </Link>
                </div>
            </Card>
        </div>
        <Modal
            active={transactionAutomationDeleting !== null}
            title={t("automation.delete")}
            close={() => setTransactionAutomationDeleting(null)}
            footer={<>
                <InputButton disabled={isUpdating}
                    className="is-danger"
                    onClick={() => forget(deleteTransactionAutomation)(transactionAutomationDeleting?.id)}>
                    {t("automation.delete")}
                </InputButton>
                <InputButton
                    disabled={isUpdating}
                    onClick={() => setTransactionAutomationDeleting(null)}>
                    {t("common.cancel")}
                </InputButton>
            </>}>
            <p>{t("automation.confirm_delete", { name: transactionAutomationDeleting?.name, description: transactionAutomationDeleting?.description }) }</p>
            <p>{t("common.action_is_irreversible")}</p>
        </Modal>
    </>;

    async function refreshLists (api: Api): Promise<void> {
        const result = await api.Automation.Transaction.list();
        if (result.status === 200) {
            setTransactionAutomations(result.data);
        }
    }

    async function deleteTransactionAutomation (id: number): Promise<void> {
        if (api === null) return;

        setIsUpdating(true);
        const result = await api.Automation.Transaction.delete(id);
        if (result.status === 200) {
            await refreshLists(api);
        }
        setIsUpdating(false);
        setTransactionAutomationDeleting(null);
    }
}
