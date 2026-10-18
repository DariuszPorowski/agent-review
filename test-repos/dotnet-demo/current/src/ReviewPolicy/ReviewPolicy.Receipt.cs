using Newtonsoft.Json;

namespace AgentReview.DotnetDemo;

public partial class ReviewPolicy
{
    public string CreateReceipt(string label, int score)
    {
        return JsonConvert.SerializeObject(new
        {
            Label = label,
            Score = score,
            Decision = Evaluate(label, score)
        });
    }
}
