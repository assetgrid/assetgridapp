using homebudget_server.Models;
using Microsoft.EntityFrameworkCore;

namespace homebudget_server.Data
{
    public class HomebudgetContext : DbContext
    {
        public HomebudgetContext(DbContextOptions<HomebudgetContext> options) : base(options)
        {
        }

        public DbSet<Account> Accounts { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<TransactionLine> TransactionLines { get; set; }
    }
}
