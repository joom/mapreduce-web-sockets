import java.io.*;
import java.util.Scanner;

public class JSONStringsLarge {
    public static void main(String[] args) {

        // Open file
        FileReader fr;
        try {
            fr = new FileReader(args[0]);
        } catch (FileNotFoundException ex) {
            throw new RuntimeException("File input missing");
        }
        Scanner inFile = new Scanner(fr);

        // create output file
        File myObj;
        try {
            myObj = new File(args[0] + ".json");
            if (myObj.createNewFile()) {
                System.out.println("File created: " + myObj.getName());
            } else {
                System.out.println("File already exists.");
            }
        } catch (
                IOException e) {
            System.out.println("Error occurred");
        }

        // create a writer for that output file
        FileWriter myWriter;
        try {
            myWriter = new FileWriter(args[0] + ".json");
        } catch (IOException e) {
            throw new RuntimeException("Issues here");
        }

        int numWords = 0;

        // first create the dictionary array object
        try {
            myWriter.write('[');
        } catch (IOException e) {
            throw new RuntimeException("Issues here");
        }

        while (inFile.hasNext()) {
            numWords++;
            String s = inFile.next();
            s = s.replaceAll("[^a-zA-Z0-9]", "");
            StringBuilder sb = new StringBuilder();
            sb.append('"');
            sb.append(s);
            sb.append('"');
            try {
                myWriter.write(sb.toString());
                if (inFile.hasNext()) myWriter.write(", ");
                else {
                    myWriter.write("]");   // close the array at the end
                    myWriter.close();
                }
            } catch (IOException e) {
                throw new RuntimeException("Issues here");
            }
        }
    }
}

