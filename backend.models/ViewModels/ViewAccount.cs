using assetgrid_backend.Models;
using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models.ViewModels
{
    public class ViewAccount : IValidatableObject
    {
        public int Id { get; set; }

        [MaxLength(50, ErrorMessage = "Name must be shorter than 50 characters.")]
        public string Name { get; set; }

        [MaxLength(250, ErrorMessage = "Description must be shorter than 250 characters.")]
        public string Description { get; set; }
        public List<string> Identifiers { get; set; }
        public bool Favorite { get; set; }
        public long Balance { get; set; }
        public string BalanceString { get => Balance.ToString(); set => Balance = long.Parse(value); }
        public bool IncludeInNetWorth { get; set; }
        public AccountPermissions Permissions { get; set; }

        public ViewAccount (
            int id,
            string name,
            string description,
            List<string> identifiers,
            bool favorite,
            bool includeInNetWorth,
            AccountPermissions permissions,
            long balance
            )
        {
            Id = id;
            Name = name;
            Description = description;
            Identifiers = identifiers;
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
        IEnumerable<ValidationResult> IValidatableObject.Validate(ValidationContext validationContext)
        {
            if (Identifiers.Any(x => x.Length > 100))
            {
                yield return new ValidationResult(
                    $"Identifier must be shorter than 100 characters.",
                    new[] { nameof(Identifiers) });
            }
        }

        public static ViewAccount GetNoReadAccess(int id)
        {
            return new ViewAccount(
                id,
                "Unknown",
                "You do not have permission to view this account",
                new List<string>(),
                false,
                false,
                AccountPermissions.None,
                0
            );
        }
    }

    public class ViewCreateAccount : IValidatableObject
    {
        [MaxLength(50, ErrorMessage = "Name must be shorter than 50 characters.")]
        public required string Name { get; set; }

        [MaxLength(250, ErrorMessage = "Description must be shorter than 250 characters.")]
        public required string Description { get; set; }
        public required List<string> Identifiers { get; set; }
        public bool IncludeInNetWorth { get; set; }
        public bool Favorite { get; set; }

        IEnumerable<ValidationResult> IValidatableObject.Validate(ValidationContext validationContext)
        {
            if (Identifiers.Any(x => x.Length > 100))
            {
                yield return new ValidationResult(
                    $"Identifier must be shorter than 100 characters.",
                    new[] { nameof(Identifiers) });
            }
        }
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
        public long TransferRevenue { get; set; }
        public string TransferRevenueString { get => TransferRevenue.ToString(); set => TransferRevenue = long.Parse(value); }
        public long Expenses { get; set; }
        public string ExpensesString { get => Expenses.ToString(); set => Expenses = long.Parse(value); }
        public long TransferExpenses { get; set; }
        public string TransferExpensesString { get => TransferExpenses.ToString(); set => TransferExpenses = long.Parse(value); }
    }

    public class ViewGetMovementResponse
    {
        public long InitialBalance { get; set; }
        public string InitialBalanceString { get => InitialBalance.ToString(); set => InitialBalance = long.Parse(value); }
        public required List<ViewAccountMovementItem> Items { get; set; }
    }

    public class ViewGetMovementAllResponse
    {
        public required Dictionary<int, ViewGetMovementResponse> Items { get; set; }
        public required List<ViewAccount> Accounts { get; set; }
    }

    public class ViewCategorySummary
    {
        public required string Category { get; set; }

        /// <summary>
        /// Whether this summary represents transfers between accounts included in net worth
        /// </summary>
        public bool Transfer { get; set; }
        public long Expenses { get; set; }
        public long Revenue { get; set; }
    }
}
