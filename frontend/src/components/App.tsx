import * as React from "react";
import { Route, Routes, useNavigate } from "react-router";
import { routes } from "../lib/routes";
import PageTransactions from "./pages/transaction/PageTransactions";
import PageCreateTransaction from "./pages/transaction/PageCreateTransaction";
import PageDashboard from "./pages/PageDashboard";
import PageImportTransactionsCsv from "./pages/transaction/PageImportTransactionsCsv";
import PageAccount from "./pages/account/PageAccount";
import { Preferences } from "../models/preferences";
import PagePreferences from "./pages/PagePreferences";
import PageAccountOverview from "./pages/account/PageAccountOverview";
import * as Api from "../lib/ApiClient";
import Sidebar from "./common/Sidebar";
import PageTransaction from "./pages/transaction/PageTransaction";
import PageEditMultipleTransactions from "./pages/transaction/PageEditMultipleTransactions";
import PageAccountConfirmDelete from "./pages/account/PageAccountConfirmDelete";
import Page404 from "./pages/Page404";
import PageCreateAccount from "./pages/account/PageCreateAccount";
import MobileHeader from "./common/MobileHeader";
import { User } from "../models/user";
import { Account } from "../models/account";
import PageLogin from "./pages/PageLogin";
import PageSignup from "./pages/PageSignup";
import PageProfile from "./pages/PageProfile";

export const userContext = React.createContext<UserContext>({ user: "fetching", updatePreferences: () => 0, updateFavoriteAccounts: () => 0, setUser: () => 0 });
export const modalContainerContext = React.createContext<{ container: HTMLDivElement | null }>({ container: null });

interface UserContext {
    user: User | "fetching"
    updatePreferences: (newPreferences: Preferences) => void
    updateFavoriteAccounts: (newFavoriteAccounts: Account[]) => void
    setUser: (user: User | null) => void
}

export default function AssetgridApp (): React.ReactElement {
    const [user, setUser] = React.useState<User | "fetching">("fetching");
    const modalContainer = React.useRef<HTMLDivElement>(null);
    const [showSidebar, setShowSidebar] = React.useState(false);
    const navigate = useNavigate();

    React.useEffect(() => { void authenticate(); }, []);

    return <React.StrictMode>
        <userContext.Provider value={{ user, updatePreferences, updateFavoriteAccounts, setUser: updateUser }}>
            <Routes>
                <Route path={routes.login()} element={<PageLogin />} />
                <Route path={routes.signup()} element={<PageSignup />} />
                <Route path='*' element={<>
                    <modalContainerContext.Provider value={{ container: modalContainer.current }}>
                        <div className="mobile-header-spacing"></div>
                        <MobileHeader setShowSidebar={setShowSidebar} sidebarVisible={showSidebar} />
                        <div style={{ display: "flex", flexGrow: 1 }}>
                            <Sidebar show={showSidebar} setShowSidebar={setShowSidebar}></Sidebar>
                            <div className={"main-content" + (showSidebar ? " sidebar-shown" : "")} style={{ flexGrow: 1, backgroundColor: "#EEE", maxWidth: "100%" }}>
                                <Routes>
                                    <Route path={routes.dashboard()} element={<PageDashboard />} />
                                    <Route path={routes.importCsv()} element={<PageImportTransactionsCsv />}/>
                                    <Route path={routes.transaction(":id")} element={<PageTransaction />}/>
                                    <Route path={routes.transactions()} element={<PageTransactions />}/>
                                    <Route path={routes.transactionEditMultiple()} element={<PageEditMultipleTransactions />}/>
                                    <Route path={routes.transactionCreate()} element={<PageCreateTransaction />} />
                                    <Route path={routes.accounts()} element={<PageAccountOverview />} />
                                    <Route path={routes.account(":id")} element={<PageAccount />} />
                                    <Route path={routes.accountDelete(":id")} element={<PageAccountConfirmDelete />} />
                                    <Route path={routes.accountCreate()} element={<PageCreateAccount />} />
                                    <Route path={routes.preferences()} element={<PagePreferences />} />
                                    <Route path={routes.profile()} element={<PageProfile />} />

                                    <Route path='*' element={<Page404 />} />
                                </Routes>
                            </div>
                        </div>
                    </modalContainerContext.Provider>
                    <div ref={modalContainer}></div>
                </>} />
            </Routes>
        </userContext.Provider>
    </React.StrictMode>;

    async function authenticate (): Promise<void> {
        const result = await Api.getUser();
        if (result.status === 200) {
            setUser(result.data);
        } else {
            // Navigate to the login page
            navigate(routes.login());
        }
    }

    function updatePreferences (newPreferences: Preferences): void {
        if (user === "fetching") return;

        setUser({
            ...user,
            preferences: newPreferences
        });
    }

    function updateFavoriteAccounts (newFavoriteAccounts: Account[]): void {
        if (user === "fetching") return;

        setUser({
            ...user,
            favoriteAccounts: newFavoriteAccounts
        });
    }

    function updateUser (newUser: User | null): void {
        if (newUser === null) {
            localStorage.removeItem("token");
            setUser("fetching");
            navigate(routes.login());
        } else {
            setUser(newUser);
        }
    }
}
