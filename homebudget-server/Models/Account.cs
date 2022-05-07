using homebudget_server.Models.ViewModels;

namespace homebudget_server.Models
{
    public class Account
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string? AccountNumber { get; set; }
    }
}
