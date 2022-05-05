namespace homebudget_server.Models.ViewModels
{
    public class ViewAccount
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
    }

    public class CreateViewAccount
    {
        public string Name { get; set; }
        public string Description { get; set; }
    }
}
