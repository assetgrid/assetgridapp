using assetgrid_backend.Models;

namespace assetgrid_backend.ViewModels
{
    public class ViewAccount
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string? AccountNumber { get; set; }
        public bool Favorite { get; set; }
        public long Balance { get; set; }
        public string BalanceString { get => Balance.ToString(); set => Balance = long.Parse(value); }
        public bool IncludeInNetWorth { get; set; }
        public AccountPermissions Permissions { get; set; }

        public ViewAccount (
            int id,
            string name,
            string description,
            string? accountNumber,
            bool favorite,
            bool includeInNetWorth,
            AccountPermissions permissions,
            long balance
            )
        {
            Id = id;
            Name = name;
            Description = description;
            AccountNumber = accountNumber;
            Favorite = favorite;
            Balance = balance;
            IncludeInNetWorth = includeInNetWorth;
            Permissions = permissions;
        }

        public enum AccountPermissions
        {
            None,
            Read,
            ModifyTransactions,
            All
        }

        public static AccountPermissions PermissionsFromDbPermissions(UserAccountPermissions permissions)
        {
            return (AccountPermissions)(permissions + 1);
        }

        public static ViewAccount GetNoReadAccess(int id)
        {
            return new ViewAccount(
                id,
                "Unknown",
                "You do not have permission to view this account",
                null,
                false,
                false,
                AccountPermissions.None,
                0
            );
        }
    }

    public class ViewCreateAccount
    {
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string? AccountNumber { get; set; }
        public bool IncludeInNetWorth { get; set; }
        public bool Favorite { get; set; }
    }

    public enum AccountMovementResolution
    {
        Daily,
        Weekly,
        Monthly,
        Yearly,
    }

    public class ViewGetMovementRequest
    {
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public AccountMovementResolution Resolution { get; set; }
    }

    public class ViewAccountMovementItem
    {
        public DateTime DateTime { get; set; }

        public long Revenue { get; set; }
        public string RevenueString { get => Revenue.ToString(); set => Revenue = long.Parse(value); }

        public long Expenses { get; set; }
        public string ExpensesString { get => Expenses.ToString(); set => Expenses = long.Parse(value); }
    }

    public class ViewGetMovementResponse
    {
        public long InitialBalance { get; set; }
        public string InitialBalanceString { get => InitialBalance.ToString(); set => InitialBalance = long.Parse(value); }
        public List<ViewAccountMovementItem> Items { get; set; } = null!;
    }

    public class ViewGetMovementAllResponse
    {
        public Dictionary<int, ViewGetMovementResponse> Items { get; set; } = null!;
        public List<ViewAccount> Accounts { get; set; } = null!;
    }

    public class ViewCategorySummary
    {
        public string Category { get; set; } = null!;
        public long Expenses { get; set; }
        public long Revenue { get; set; }
    }
}
