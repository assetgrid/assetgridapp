import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useApi } from "../../lib/ApiClient";
import { forget } from "../../lib/Utils";
import Modal from "../common/Modal";
import InputButton from "../input/InputButton";

interface Props {
    active: boolean
    close: () => void
}

export default function DeleteUserModal (props: Props): React.ReactElement {
    const [isDeleting, setisDeleting] = React.useState(false);
    const api = useApi();
    const navigate = useNavigate();
    const { t } = useTranslation();

    return <Modal
        active={props.active}
        title={t("user.delete_user")}
        close={() => props.close()}
        footer={<>
            {<InputButton onClick={forget(deleteUser)}
                disabled={isDeleting || api === null}
                className="is-danger">
                {t("user.delete_user")}
            </InputButton>}
            <button className="button" onClick={() => props.close()}>{t("common.cancel")}</button>
        </>}>
        <p>{t("user.confirm_delete")}</p>
    </Modal>;

    async function deleteUser (): Promise<void> {
        if (api === null) return;

        setisDeleting(true);
        await api.User.delete();
        // Refresh the page
        navigate(0);
    }
}
