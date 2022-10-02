using assetgrid_backend.Data;
using Microsoft.EntityFrameworkCore;

namespace assetgrid_backend.Services
{
    public interface IAccountService
    {
        public Task Delete(int id);
    }

    public class AccountService : IAccountService
    {
        private readonly AssetgridDbContext _context;

        public AccountService(AssetgridDbContext context)
        {
            _context = context;
        }

        public async Task Delete(int id)
        {
            if (_context.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
            {
                // InMemory database does not support raw SQL
                (await _context.Transactions.Where(transaction => transaction.SourceAccountId == id).ToListAsync())
                    .ForEach(transaction => transaction.SourceAccountId = null);
                (await _context.Transactions.Where(transaction => transaction.DestinationAccountId == id).ToListAsync())
                    .ForEach(transaction => transaction.DestinationAccountId = null);
                await _context.SaveChangesAsync();
                _context.Transactions.RemoveRange(
                    _context.Transactions.Where(transaction => transaction.DestinationAccountId == null && transaction.SourceAccountId == null));
                _context.Accounts.RemoveRange(
                    _context.Accounts.Where(account => account.Id == id));
            }
            else
            {
                // Remove all references to this account on transactions
                _context.Database.ExecuteSqlInterpolated($"UPDATE Transactions SET SourceAccountId = null WHERE SourceAccountId = {id}");
                _context.Database.ExecuteSqlInterpolated($"UPDATE Transactions SET DestinationAccountId = null WHERE DestinationAccountId = {id}");
                // Delete transactions that do not have any accounts
                _context.Database.ExecuteSqlInterpolated($"DELETE FROM Transactions WHERE SourceAccountId IS NULL AND DestinationAccountId IS NULL");
                // Delete UserAccounts referencing this account
                _context.Database.ExecuteSqlInterpolated($"DELETE FROM UserAccounts WHERE AccountId = {id}");
                _context.Database.ExecuteSqlInterpolated($"DELETE FROM Accounts WHERE Id = {id}");
            }
            await _context.SaveChangesAsync();
        }
    }
}
