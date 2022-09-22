using assetgrid_backend.Models.ViewModels;

namespace assetgrid_backend.Models
{
    public class Account
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string? AccountNumber { get; set; }
        public bool Favorite { get; set; }
        public bool IncludeInNetWorth { get; set; }
    }

    public static class AccountQueryableExtensions
    {
        public static IQueryable<ViewAccount> SelectView(this IQueryable<Account> query)
        {
            return query.Select(account => new ViewAccount
            {
                Id = account.Id,
                Name = account.Name,
                AccountNumber = account.AccountNumber,
                Description = account.Description,
                Favorite = account.Favorite,
                IncludeInNetWorth = account.IncludeInNetWorth,
            });
        }
    }
}
