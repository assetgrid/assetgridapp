namespace homebudget_server.Models.ViewModels
{
    public class ViewAccount
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string? AccountNumber { get; set; }
        public bool Favorite { get; set; }
    }

    public class CreateViewAccount
    {
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;

        public string? AccountNumber { get; set; }
    }
}
